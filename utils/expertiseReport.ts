import type {
  ChecklistItem,
  ChronicIssue,
  PriceAssessment,
  Product,
  Severity,
} from '../types/product';
import { calculateRiskScore } from './evaluator';

export interface ReportValuation {
  askingPrice: number;
  min: number;
  fair: number;
  max: number;
  assessment: PriceAssessment;
}
export interface ExpertiseReport {
  createdAt: string;
  dateLabel: string;
  productId: string;
  deviceName: string;
  specs: string;
  conditionLabel: string;
  marketFairPrice: number;
  valuation: ReportValuation | null;
  priceVerdict: string;
  completed: ChecklistItem[];
  unchecked: ChecklistItem[];
  total: number;
  alerts: ChronicIssue[];
  riskScore: number;
  health: {
    score: number | null;
    label: string;
    tone: 'neutral' | 'positive' | 'warning' | 'danger';
  };
  plainText: string;
}
interface ReportInput {
  product: Product;
  checkedIds: ReadonlySet<string>;
  valuation: ReportValuation | null;
  conditionLabel: string;
  createdAt?: Date;
}
export const REPORT_SEVERITIES: Record<Severity, string> = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
};
export const REPORT_NOTE =
  'İşaretli kontroller kullanıcı beyanıyla başarılı kabul edilir. İşaretsiz adımlar arıza tespiti değildir; model uyarıları bu cihazda doğrulanmış kusur anlamına gelmez. Bu özet kesin ekspertiz veya garanti belgesi değildir.';
export const reportMoney = (value: number): string =>
  `${value.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} TL`;

/** Snapshot the current analysis and inspection, ignoring IDs from other devices. */
export function buildExpertiseReport({
  product,
  checkedIds,
  valuation,
  conditionLabel,
  createdAt = new Date(),
}: ReportInput): ExpertiseReport {
  if (!Number.isFinite(createdAt.getTime()))
    throw new RangeError('Geçerli rapor tarihi gerekir.');
  const completed = product.checklist
    .filter((item) => checkedIds.has(item.id))
    .map((item) => ({ ...item }));
  const unchecked = product.checklist
    .filter((item) => !checkedIds.has(item.id))
    .map((item) => ({ ...item }));
  const alerts = product.chronicIssues.map((issue) => ({ ...issue }));
  const risk = calculateRiskScore(alerts);
  const total = product.checklist.length;
  // A completion/risk summary, not measured physical health. Missing inspections
  // cannot receive a purchase recommendation, regardless of the numeric score.
  const score =
    total > 0 && completed.length > 0
      ? Math.round(
          ((completed.length / total) * 7 + (1 - risk.score / 100) * 3) * 10,
        ) / 10
      : null;
  const health: ExpertiseReport['health'] =
    score === null
      ? { score: null, label: 'Değerlendirilmedi', tone: 'neutral' }
      : unchecked.length > 0
        ? { score, label: 'Ekspertiz Tamamlanmalı', tone: 'warning' }
        : risk.level === 'Yüksek'
          ? { score, label: 'Riskler İncelenmeli', tone: 'danger' }
          : score >= 8
            ? { score, label: 'Satın Alınabilir · Koşullu', tone: 'positive' }
            : { score, label: 'Bakım Bütçesi Ayırın', tone: 'warning' };
  const priceVerdict = !valuation
    ? 'Fiyat Analizi Yapılmadı'
    : valuation.assessment.status === 'bargain'
      ? 'Fırsat'
      : valuation.assessment.status === 'overpriced'
        ? 'Pazarlık Gerekli'
        : 'Piyasa Değerinde';
  const report: ExpertiseReport = {
    createdAt: createdAt.toISOString(),
    dateLabel: new Intl.DateTimeFormat('tr-TR', {
      timeZone: 'Europe/Istanbul',
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(createdAt),
    productId: product.id,
    deviceName: product.name,
    specs:
      product.name.match(/\(([^()]*)\)$/)?.[1] ??
      'İlandaki kapasite / yapılandırmayı doğrulayın.',
    conditionLabel,
    marketFairPrice: product.fairPrice,
    valuation: valuation
      ? { ...valuation, assessment: { ...valuation.assessment } }
      : null,
    priceVerdict,
    completed,
    unchecked,
    total,
    alerts,
    riskScore: risk.score,
    health,
    plainText: '',
  };
  report.plainText = formatExpertiseReport(report);
  return report;
}

export function formatExpertiseReport(report: ExpertiseReport): string {
  const lines = [
    'SecondCheck İkinci El Ekspertiz Raporu',
    `Değerlendirme Tarihi: ${report.dateLabel}`,
    `Cihaz: ${report.deviceName}`,
    `Ürün Kimliği: ${report.productId}`,
    `Hedef Özellikler: ${report.specs}`,
    `Kondisyon: ${report.conditionLabel}`,
    '',
    'FİYAT DEĞERLENDİRMESİ',
    `İlan Fiyatı: ${report.valuation ? reportMoney(report.valuation.askingPrice) : 'Henüz analiz edilmedi'}`,
    `Piyasa Adil Değer: ${reportMoney(report.marketFairPrice)}`,
  ];
  if (report.valuation)
    lines.push(
      `Kondisyona Göre Adil Değer: ${reportMoney(report.valuation.fair)}`,
      `Analiz Aralığı: ${reportMoney(report.valuation.min)} – ${reportMoney(report.valuation.max)}`,
    );
  lines.push(`Fiyat Sonucu: ${report.priceVerdict}`);
  if (report.valuation) lines.push(report.valuation.assessment.adviceText);
  lines.push(
    '',
    'TEST SKOR KARTI',
    `${report.completed.length}/${report.total} Test Başarılı (kullanıcı beyanı)`,
  );
  for (const item of report.completed)
    lines.push(`[✓] ${item.title} · ${item.targetArea}`);
  lines.push('', 'TESPİT EDİLEN RİSKLER / KONTROL EKSİKLERİ');
  if (report.unchecked.length === 0) lines.push('İşaretsiz kontrol adımı yok.');
  for (const item of report.unchecked)
    lines.push(
      `[ ] Doğrulanmadı: ${item.title} · ${item.targetArea}`,
      `    ${item.instruction}`,
    );
  lines.push('', 'MODEL UYARILARI (CİHAZDA TEYİT EDİLMEDİ)');
  if (report.alerts.length === 0)
    lines.push(
      'Kayıtlı model uyarısı yok; bu, arızasızlık garantisi değildir.',
    );
  for (const issue of report.alerts)
    lines.push(
      `• ${REPORT_SEVERITIES[issue.severity]}: ${issue.title}`,
      `  ${issue.description}`,
      `  Tahmini Onarım / Bakım: ${issue.estimatedRepairCost}`,
    );
  lines.push(
    '',
    'GENEL SAĞLIK NOTU (BEYAN / RİSK BAZLI)',
    `${report.health.score === null ? '—' : report.health.score.toLocaleString('tr-TR', { minimumFractionDigits: 1 })} / 10 · ${report.health.label}`,
    `Kayıtlı model risk puanı: ${report.riskScore}/100`,
    'Not: %70 tamamlanan kontrol oranı + %30 düşük model riski. Fiziksel sağlık ölçümü değildir.',
    '',
    REPORT_NOTE,
  );
  return lines.join('\n');
}
