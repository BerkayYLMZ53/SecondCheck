import type { ParsedListingResult } from '../types/listing';
import type { TrustAdjustment, TrustAssessment } from '../types/trust';
import type { InspectionFacts, LabResults } from '../types/inspection';
import { LAB_IDS, LAB_LABELS } from './inspection';
import { VISUAL_CONDITIONS } from './visualInspection';

export function trustBand(score: number): Pick<TrustAssessment, 'grade' | 'color' | 'label'> {
  if (score >= 85) return { grade: 'A+', color: '#10b981', label: 'A+ Kusursuz Kondisyon / Tavsiye Edilir' };
  if (score >= 65) return { grade: 'B', color: '#f59e0b', label: 'B Dikkatli İncelenmeli / Riskli Parçalar Var' };
  return { grade: 'C', color: '#ef4444', label: 'C Yüksek Risk / Satın Alınması Önerilmez' };
}

/** Explainable information/check-completion heuristic, never a measured failure probability. */
export function calculateTrustScore(result: ParsedListingResult, checked: ReadonlySet<number>, lab?: LabResults, facts?: InspectionFacts): TrustAssessment {
  const device = result.matchedDevice;
  const total = device?.criticalChecks.length ?? 0;
  const completed = device?.criticalChecks.filter((_, index) => checked.has(index)).length ?? 0;
  if (!device || device.releaseYear === 0) return {
    score: 0, ...trustBand(0), label: 'Güven skoru için doğrulanabilir cihaz verisi yok',
    adjustments: [], completed, total, provisional: true, available: false,
  };
  const adjustments: TrustAdjustment[] = [];
  const add = (id: string, points: number, label: string) => adjustments.push({ id, points, label });
  if (result.flags.hasChanges) {
    const notes = result.flags.changeNotes.join(' ');
    if (/ekran/.test(notes)) add('screen', -10, 'Değişen ekran beyanı');
    if (/pil|batarya/.test(notes)) add('battery-repair', -8, 'Değişen pil beyanı');
    if (/anakart/.test(notes)) add('board', -15, 'Anakart onarımı beyanı');
    if (!adjustments.length) add('repair', -10, 'Değişim / onarım beyanı');
  }
  const battery = result.detectedBattery;
  const batteryKnown = battery !== undefined && Number.isFinite(battery) && battery >= 0 && battery <= 100;
  if (!batteryKnown) add('battery-unknown', -5, 'Pil sağlığı belirtilmedi');
  else if (battery < 80) add('battery-low', -5, 'Pil sağlığı <%80');
  else if (battery >= 90) add('battery-good', 2, 'Pil sağlığı ≥%90');
  if (result.flags.hasBox && result.flags.hasInvoice && !facts?.missingDocuments) add('documents', 5, 'Kutulu & faturalı');
  if (result.flags.hasWarranty) add('warranty', 3, 'Garanti beyanı');
  if (completed > 0 && total > 0) add('checks', Math.round(completed / total * 20), `${completed}/${total} kritik kontrol`);
  let observedFailure = false;
  if (lab) for (const id of LAB_IDS) {
    if (lab[id].status === 'fail') { observedFailure = true; add(`lab-${id}`, id === 'touch' ? -20 : id === 'pixels' ? -15 : id === 'audio' ? -10 : -5, `${LAB_LABELS[id]}: sorun bildirildi`); }
  }
  if (facts) {
    for (const key of ['trueTone', 'biometrics', 'cameras', 'liquid'] as const) {
      if (facts[key] === 'fail') { observedFailure = true; add(`physical-${key}`, key === 'liquid' ? -20 : -10, `${({ trueTone: 'True Tone', biometrics: 'Biyometri', cameras: 'Kameralar', liquid: 'Sıvı teması' })[key]}: sorun bildirildi`); }
    }
    if (facts.screenReplaced && !adjustments.some((entry) => entry.id === 'screen')) { observedFailure = true; add('observed-screen', -10, 'Ekran değişimi doğrulandı'); }
    if (facts.visualInspection && facts.visualInspection.condition !== 'pristine') {
      observedFailure = true;
      const visual = VISUAL_CONDITIONS[facts.visualInspection.condition];
      add('visual-condition', -visual.deduction, `Kasa ${facts.visualInspection.score.toLocaleString('tr-TR')}/10: ${visual.label}`);
    } else if (facts.cosmeticDamage) { observedFailure = true; add('cosmetic', -5, 'Kozmetik kusur bildirildi'); }
    if (facts.fieldInspection) for (const step of facts.fieldInspection.results) {
      if (step.status !== 'fail') continue;
      observedFailure = true;
      // A composite field question does not identify the faulty part. Avoid charging an already recorded risk twice.
      const covered = step.id === 'buttons' ? lab?.vibration.status === 'fail'
        : step.id === 'screen' ? lab?.pixels.status === 'fail' || lab?.touch.status === 'fail' || facts.trueTone === 'fail'
          : step.id === 'audio' ? lab?.audio.status === 'fail'
            : step.id === 'camera' ? facts.cameras === 'fail'
              : step.id === 'port' ? facts.caseCondition === 'fail' || facts.cosmeticDamage : false;
      if (!covered) add(`field-${step.id}`, step.id === 'account' ? -25 : step.id === 'buttons' ? -8 : -10, `Saha: ${step.title} — sorun bildirildi`);
    }
  }
  const readyForTopGrade = total > 0 && completed === total && !result.flags.hasChanges && !observedFailure && batteryKnown && battery >= 80;
  let score = 70 + adjustments.reduce((sum, item) => sum + item.points, 0);
  if (facts?.fieldInspection?.results.some((step) => step.id === 'account' && step.status === 'fail') && score > 64) {
    add('account-risk-cap', 64 - score, 'Hesap / aktivasyon kilidi: yüksek risk sınırı');
    score = 64;
  }
  if (facts?.visualInspection?.condition === 'bent' && score > 64) {
    add('structure-risk-cap', 64 - score, 'Ciddi şasi hasarı: yüksek risk sınırı');
    score = 64;
  }
  if (!readyForTopGrade && score >= 85) {
    add('verification-cap', 84 - score, completed < total ? 'Bekleyen kritik kontroller' : observedFailure ? 'Bildirilen fiziksel kusurlar: üst not sınırı' : 'Parça / pil doğrulaması gerekli');
    score = 84;
  }
  score = Math.min(100, Math.max(0, Math.round(score)));
  return { score, ...trustBand(score), adjustments, completed, total, provisional: !readyForTopGrade, available: true };
}
