import type { Category, Product } from '../types/product';

export interface PriceTrendPoint {
  key: string;
  monthLabel: string;
  year: number;
  averagePrice: number;
  annotation: string;
}

export interface PriceTrend {
  points: PriceTrendPoint[];
  netChangePercentage: number;
  monthlyChangePercentage: number;
  outlook: 'declining' | 'stable' | 'balanced';
  advice: string;
}

const MONTHS = [
  'Oca',
  'Şub',
  'Mar',
  'Nis',
  'May',
  'Haz',
  'Tem',
  'Ağu',
  'Eyl',
  'Eki',
  'Kas',
  'Ara',
] as const;
const ANNOTATIONS = [
  'Yıl başı sonrası talebin dengelendiği dönem varsayımı.',
  'Kış döneminde görece dengeli talep varsayımı.',
  'İlkbahar öncesi ilan hareketliliği varsayımı.',
  'İlkbahar kampanyaları ve fiyat karşılaştırma dönemi varsayımı.',
  'Yaz öncesi ikinci el ilan artışı varsayımı.',
  'Yaz İndirimleri Dönemi: geçici talep yavaşlaması varsayımı.',
  'Yaz İndirimleri Dönemi: satıcı rekabeti varsayımı.',
  'Okula dönüş öncesi talep toparlanması varsayımı.',
  'Okula Dönüş Talebi: kısa süreli fiyat desteği varsayımı.',
  'Sonbaharda fiyatların dengelenmesi varsayımı.',
  'Kasım kampanyalarıyla fiyat rekabeti varsayımı.',
  'Yıl sonu hediye ve oyun talebi varsayımı.',
] as const;
const DECLINE: Record<Category, number> = {
  phone: -0.02,
  gpu: -0.021,
  cpu: -0.018,
  laptop: -0.022,
  console: -0.017,
  handheld: -0.019,
  ram: -0.017,
  motherboard: -0.018,
  monitor: -0.018,
};
const SEASONAL = [
  0, -0.002, 0.001, -0.003, -0.002, -0.006, -0.007, 0.004, 0.009, 0.003, -0.004,
  0.007,
] as const;

/** Stable FNV-1a variation; neither random state nor locale-dependent hashing. */
function variation(key: string): number {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1)
    hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
  return (hash >>> 0) / 4294967295;
}

/**
 * Six calendar months INCLUDING the current month (five monthly intervals).
 * Pure for a supplied asOf date; uses Turkey's calendar, independent of host TZ.
 * Historic points are synthetic, never claimed to be observed market averages.
 * The final point is always the product's current fairPrice, without rounding.
 */
export function generatePriceTrend(
  product: Product,
  asOf = new Date(),
): PriceTrend {
  if (
    !Number.isFinite(asOf.getTime()) ||
    !Number.isFinite(product.fairPrice) ||
    product.fairPrice <= 0
  ) {
    throw new RangeError(
      'Trend için geçerli tarih ve sıfırdan büyük adil fiyat gerekir.',
    );
  }
  const calendar = new Intl.DateTimeFormat('en', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(asOf);
  const currentYear = Number(
    calendar.find((part) => part.type === 'year')?.value,
  );
  const currentMonth =
    Number(calendar.find((part) => part.type === 'month')?.value) - 1;
  const age = currentYear - product.releaseYear;
  // Demand overrides age: these families are intentionally modeled as resilient.
  const highDemand =
    /7800X3D|iPhone 13(?:\s|\()|PlayStation 5|\bPS5\b/i.test(product.name) ||
    (age <= 2 && /X3D|Pro Max|Ultra|RTX 40[89]0/i.test(product.name));
  const olderGeneration =
    /iPhone 11(?:\s|\()|PlayStation 4|\bPS4\b|RTX 3060/i.test(product.name);
  const outlook: PriceTrend['outlook'] = highDemand
    ? 'stable'
    : age > 2 || olderGeneration
      ? 'declining'
      : 'balanced';

  const points: PriceTrendPoint[] = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(currentYear, currentMonth - 5 + index, 1));
    const month = date.getUTCMonth();
    const year = date.getUTCFullYear();
    return {
      key: `${year}-${String(month + 1).padStart(2, '0')}`,
      monthLabel: MONTHS[month] ?? '',
      year,
      averagePrice: product.fairPrice,
      annotation: ANNOTATIONS[month] ?? 'Dengeli talep varsayımı.',
    };
  });
  for (let index = 4; index >= 0; index -= 1) {
    const point = points[index];
    const next = points[index + 1];
    if (!point || !next) continue;
    const noise =
      variation(
        `${product.id}|${product.category}|${product.releaseYear}|${next.key}`,
      ) - 0.5;
    const month = Number(next.key.slice(-2)) - 1;
    const seasonal = SEASONAL[month] ?? 0;
    const rate =
      outlook === 'declining'
        ? Math.max(
            -0.024,
            Math.min(-0.016, DECLINE[product.category] + noise * 0.005),
          )
        : outlook === 'stable'
          ? 0.001 + seasonal + noise * 0.004
          : -0.006 + seasonal * 0.4 + noise * 0.004;
    const historic = next.averagePrice / (1 + rate);
    const rounded = Math.max(1, Math.round(historic));
    // Keep integer-TL labels inside the promised decline band even for cheap RAM.
    point.averagePrice =
      outlook === 'declining'
        ? Math.min(
            Math.floor(next.averagePrice / 0.975),
            Math.max(Math.ceil(next.averagePrice / 0.985), rounded),
          )
        : rounded;
  }
  const first = points[0]?.averagePrice ?? product.fairPrice;
  const ratio = product.fairPrice / first;
  return {
    points,
    netChangePercentage: (ratio - 1) * 100,
    monthlyChangePercentage: (ratio ** (1 / 5) - 1) * 100,
    outlook,
    advice:
      outlook === 'declining'
        ? 'Simülasyonda düşüş eğilimi var; acele etmeden benzer ilanları karşılaştırın.'
        : outlook === 'stable'
          ? 'Simülasyonda fiyatlar görece sabit; kondisyon, garanti ve bakım geçmişini öne alın.'
          : 'Simülasyonda sınırlı değişim var; güncel ilanları ve toplam bakım maliyetini karşılaştırın.',
  };
}
