import type { ChronicIssue, PriceAssessment, Severity } from '../types/product';

const SEVERITY_POINTS: Record<Severity, number> = {
  high: 35,
  medium: 20,
  low: 10,
};

const formatPrice = (price: number): string =>
  `${price.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} TL`;

/** Delta is signed: negative means below fair value, positive means above. */
export function evaluatePrice(
  askingPrice: number,
  fairPrice: number,
  min: number,
  max: number,
): PriceAssessment {
  if (![askingPrice, fairPrice, min, max].every(Number.isFinite)) {
    throw new RangeError('Fiyatlar sonlu sayılar olmalıdır.');
  }
  if (askingPrice < 0 || fairPrice <= 0 || min < 0 || min > max || fairPrice < min || fairPrice > max) {
    throw new RangeError('Fiyatlar geçerli bir piyasa aralığında olmalı; adil fiyat sıfırdan büyük olmalıdır.');
  }

  const deltaPercentage = ((askingPrice - fairPrice) / fairPrice) * 100;
  const marketNote = `Referans piyasa aralığı: ${formatPrice(min)}–${formatPrice(max)}.`;

  if (askingPrice < fairPrice * 0.92) {
    return {
      status: 'bargain',
      deltaPercentage,
      adviceText: `Fırsat Fiyatı: Adil değerin %${Math.abs(deltaPercentage).toFixed(1).replace('.', ',')} altında. ${marketNote} Ödeme öncesinde arıza, onarım geçmişi ve sahiplik bilgilerini doğrulayın; kontrol listesini tamamlayın.${askingPrice < min ? ' İlan piyasa alt sınırının da altında; düşük fiyatın nedenini satıcıya sorun.' : ''}`,
    };
  }

  if (askingPrice > fairPrice * 1.08) {
    return {
      status: 'overpriced',
      deltaPercentage,
      adviceText: `Pahalı / Pazarlık Yapılmalı: Adil değerin %${deltaPercentage.toFixed(1).replace('.', ',')} üzerinde. ${marketNote} ${formatPrice(fairPrice)} civarında teklif verin; kondisyon, garanti ve aksesuarların farkı karşılayıp karşılamadığını kontrol edin.${askingPrice > max ? ' İlan piyasa üst sınırını da aşıyor; alternatif ilanları karşılaştırın.' : ''}`,
    };
  }

  return {
    status: 'fair',
    deltaPercentage,
    adviceText: `Piyasa Değerinde: Fiyat adil değer olan ${formatPrice(fairPrice)} çevresindeki %8 bandında. ${marketNote} Kontrol listesini tamamlayın; bakım veya onarım gerekiyorsa maliyetini teklifinizden düşün.`,
  };
}

/** Additive screening score, capped at 100; not a probability of failure. */
export function calculateRiskScore(
  issues: ChronicIssue[],
): { score: number; level: 'Düşük' | 'Orta' | 'Yüksek' } {
  const score = Math.min(100, issues.reduce((total, issue) => total + SEVERITY_POINTS[issue.severity], 0));
  const level = score >= 70 ? 'Yüksek' : score >= 35 ? 'Orta' : 'Düşük';
  return { score, level };
}
