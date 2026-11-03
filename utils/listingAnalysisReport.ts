import type { ParsedListingResult } from '../types/listing';
import { compareDevicePrice } from './deviceListingParser';
import { calculateTrustScore } from './trustScore';
import type { InspectionFacts, LabResults } from '../types/inspection';
import { LAB_IDS, LAB_LABELS, STATUS_LABELS } from './inspection';
import { visualScoreLabel } from './visualInspection';

export interface ListingAnalysisReport {
  createdAt: string;
  dateLabel: string;
  deviceName: string;
  completed: string[];
  pending: string[];
  plainText: string;
}

export function listingMoney(value: number): string {
  return `${value.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} TL`;
}

export function catalogDeviceName(result: ParsedListingResult): string {
  const device = result.matchedDevice;
  if (!device) return 'Cihaz eşleştirilemedi';
  return device.model.toLowerCase().startsWith(device.brand.toLowerCase())
    ? device.model : `${device.brand} ${device.model}`;
}

/** Snapshot only current-device checks; unchecked does not mean failed. */
export function buildListingAnalysisReport(
  result: ParsedListingResult,
  checkedIndices: ReadonlySet<number>,
  title = '',
  createdAt = new Date(),
  lab?: LabResults,
  facts?: InspectionFacts,
): ListingAnalysisReport {
  const device = result.matchedDevice;
  if (!device) throw new Error('Rapor için önce bir cihaz eşleştirin.');
  if (!Number.isFinite(createdAt.getTime())) throw new RangeError('Geçerli rapor tarihi gerekir.');
  const completed = device.criticalChecks.filter((_, index) => checkedIndices.has(index));
  const pending = device.criticalChecks.filter((_, index) => !checkedIndices.has(index));
  const deviceName = catalogDeviceName(result);
  const dateLabel = createdAt.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
  const average = device.estimatedPriceBand.avgTry;
  const { flags } = result;
  const trust = calculateTrustScore(result, checkedIndices, lab, facts);
  const comparison = compareDevicePrice(device, result.detectedPrice);
  const status = comparison?.status;
  const verdict = status === 'FIRSAT' ? 'Fırsat Fiyat' : status === 'PAHALI' ? 'Piyasa Üstü'
    : status === 'NORMAL' ? 'Normal Piyasa' : 'Fiyat karşılaştırması yapılamadı';
  const lines = [
    'SECONDCHECK • İLAN EKSPERTİZ RAPORU',
    `Tarih: ${dateLabel}`, ...(title ? [`İlan: ${title}`] : []),
    `Cihaz: ${deviceName}`, `Katalog ID: ${device.id}`,
    `Depolama: ${result.detectedStorage?.replace(/(\d)(GB|TB)$/, '$1 $2') ?? 'Belirtilmedi'}`,
    `Pil sağlığı: ${result.detectedBattery === undefined ? 'Belirtilmedi' : `%${result.detectedBattery}`}`,
    '', 'FİYAT DEĞERLENDİRMESİ',
    `İlan Fiyatı: ${result.detectedPrice === undefined ? 'Belirtilmedi' : listingMoney(result.detectedPrice)}`,
    `Piyasa Ortalaması (tahmini katalog referansı): ${average > 0 ? listingMoney(average) : 'Referans yok'}`,
    `Durum: ${verdict}`,
    ...(comparison ? [`Referans farkı: %${comparison.differencePercentage.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}`] : []),
    '', `GÜVEN SKORU: ${trust.available ? `${trust.score}/100 • ${trust.grade}` : 'Veri yetersiz'}`,
    ...trust.adjustments.map((item) => `${item.points > 0 ? '+' : ''}${item.points} ${item.label}`),
    '', 'İLAN BEYANLARI',
    `Kutu: ${flags.hasBox ? 'Var' : 'Yok / belirtilmedi'}`,
    `Fatura: ${flags.hasInvoice ? 'Var' : 'Yok / belirtilmedi'}`,
    `Garanti: ${flags.hasWarranty ? 'Var olarak belirtilmiş' : 'Yok / belirtilmedi'}`,
    `Parça değişimi: ${flags.hasChanges ? 'Tespit edilen değişim / onarım beyanı var' : 'Değişim beyanı yok'}`,
    ...flags.changeNotes.map((note) => `- ${note}`),
    '', `KRİTİK KONTROLLER • ${completed.length} / ${device.criticalChecks.length} işaretlendi`,
    ...device.criticalChecks.map((check, index) => `${checkedIndices.has(index) ? '[x] İşaretlendi' : '[ ] Henüz kontrol edilmedi'}: ${check}`),
    ...(lab ? ['', 'CANLI LABORATUVAR', ...LAB_IDS.map((id) => `${LAB_LABELS[id]}: ${STATUS_LABELS[lab[id].status]} • ${lab[id].note}`)] : []),
    ...(facts?.visualInspection ? ['', `KASA KONDİSYONU: ${visualScoreLabel(facts.visualInspection)}`,
      `Şasi: ${facts.visualInspection.chassis === 'bent' ? 'Eğrilik / kasa açıklığı bildirildi' : 'Düz olarak onaylandı'}`,
      'Şasi ve köşe fotoğrafları yerel analizde / PDF raporunda bulunur. Sonuç kılavuzla yapılan kullanıcı gözlemidir; otomatik AI tespiti değildir.'] : []),
    '', 'MODELE ÖZEL SORUNLAR VE KONTROL RİSKLERİ',
    ...device.chronicIssues.map((issue) => `- ${issue}`),
    '', 'İşaretler kullanıcı beyanıdır; teknik doğrulama veya arızasızlık belgesi değildir. İşaretlenmeyen testler arıza anlamına gelmez. İlan beyanları yerinde doğrulanmalıdır. Fiyatlar canlı piyasa ortalaması değil, tahmini katalog referansıdır.',
  ];
  return { createdAt: createdAt.toISOString(), dateLabel, deviceName, completed, pending, plainText: lines.join('\n') };
}
