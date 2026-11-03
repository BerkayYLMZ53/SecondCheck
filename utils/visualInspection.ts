import type { ChassisCondition, CosmeticCondition, VisualCondition, VisualEvidencePhoto, VisualInspectionResult } from '../types/visualInspection';
import type { InspectionFacts } from '../types/inspection';

export const VISUAL_CONDITIONS: Record<VisualCondition, { score: 10 | 8.5 | 6.5 | 4; label: string; deduction: number }> = {
  pristine: { score: 10, label: 'Sıfır ayarında', deduction: 0 },
  hairline: { score: 8.5, label: 'Kullanıma bağlı temiz', deduction: 5 },
  dented: { score: 6.5, label: 'Köşe vurukları / ezikler', deduction: 12 },
  bent: { score: 4, label: 'Ciddi şasi hasarı', deduction: 25 },
};
export function isSafeEvidencePhoto(photo: VisualEvidencePhoto): boolean {
  return photo.dataUri.length <= 2_000_000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(photo.dataUri)
    && Number.isInteger(photo.width) && Number.isInteger(photo.height) && photo.width > 0 && photo.height > 0 && photo.width <= 1280 && photo.height <= 1280
    && (photo.source === 'camera' || photo.source === 'upload')
    && Number.isFinite(Date.parse(photo.recordedAt));
}
export function buildVisualInspection(chassis: ChassisCondition, cosmetic: CosmeticCondition,
  photos: VisualInspectionResult['photos'], guide: VisualInspectionResult['guide'], date = new Date()): VisualInspectionResult {
  if (!isSafeEvidencePhoto(photos.chassis) || !isSafeEvidencePhoto(photos.corners)) throw new Error('Şasi ve köşe için iki geçerli fotoğraf gerekir.');
  if (!['straight', 'bent'].includes(chassis) || !['pristine', 'hairline', 'dented'].includes(cosmetic)) throw new Error('Geçerli şasi ve kozmetik gözlemi gerekir.');
  const condition: VisualCondition = chassis === 'bent' ? 'bent' : cosmetic;
  const grade = VISUAL_CONDITIONS[condition];
  if (!grade || !Number.isFinite(date.getTime())) throw new Error('Geçerli kasa değerlendirmesi gerekir.');
  return { chassis, cosmetic, condition, score: grade.score, label: grade.label, photos: { chassis: { ...photos.chassis }, corners: { ...photos.corners } },
    guide: { angle: Math.max(-15, Math.min(15, Number.isFinite(guide.angle) ? guide.angle : 0)), widthPercent: Math.max(40, Math.min(90, Number.isFinite(guide.widthPercent) ? guide.widthPercent : 80)), heightPercent: Math.max(20, Math.min(80, Number.isFinite(guide.heightPercent) ? guide.heightPercent : 32)) },
    createdAt: date.toISOString(), source: 'guided-user-observation' };
}
export function applyVisualInspection(facts: InspectionFacts, inspection: VisualInspectionResult): InspectionFacts {
  return { ...facts, visualInspection: inspection, cosmeticDamage: inspection.condition !== 'pristine', caseCondition: inspection.condition === 'pristine' ? 'pass' : 'fail' };
}
export function visualScoreLabel(inspection: VisualInspectionResult): string { return `${inspection.score.toLocaleString('tr-TR')}/10 · ${inspection.label}`; }
