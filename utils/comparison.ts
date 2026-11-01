import type { ChronicIssue, Product, Severity } from '../types/product';

export type ComparisonSlot = 'a' | 'b';
export type ComparisonPair = readonly [Product | null, Product | null];
export interface HardwareRisk {
  score: number;
  level: 'Düşük Risk' | 'Orta Risk' | 'Yüksek Risk';
}
const POINTS: Record<Severity, number> = { high: 4, medium: 2, low: 1 };

/** VS-specific screening index; distinct from the home screen's 0–100 index. */
export function calculateHardwareRisk(
  issues: readonly ChronicIssue[],
): HardwareRisk {
  const score = Math.min(
    10,
    issues.reduce((sum, issue) => sum + POINTS[issue.severity], 0),
  );
  return {
    score,
    level: score >= 7 ? 'Yüksek Risk' : score >= 4 ? 'Orta Risk' : 'Düşük Risk',
  };
}

const TOOL_RULES: readonly (readonly [RegExp, string])[] = [
  [/3utools/i, '3uTools'],
  [/furmark/i, 'FurMark'],
  [/gpu-z/i, 'GPU-Z'],
  [/cpu-z/i, 'CPU-Z'],
  [/occt/i, 'OCCT'],
  [/cinebench/i, 'Cinebench'],
  [/memtest(?:86)?/i, 'MemTest86'],
  [/hwinfo/i, 'HWiNFO'],
  [/bios/i, 'BIOS ekranı'],
  [/büyüteç|pin muayenesi/i, 'Büyüteç / makro kamera'],
  [/tek renk|renk desen|piksel/i, 'Ekran test desenleri'],
  [/microSD/i, 'Test microSD kartı'],
  [/oyun/i, 'Uyumlu test oyunu'],
  [/sağlam.*kablo|adaptör|şarj/i, 'Sağlam kablo / adaptör'],
];
export function inspectionRequirements(product: Product): {
  tools: string[];
  difficulty: 'Kolay' | 'Orta' | 'Zor';
} {
  const text = product.checklist
    .map((item) => `${item.title} ${item.instruction}`)
    .join(' ');
  const tools = TOOL_RULES.filter(([pattern]) => pattern.test(text)).map(
    ([, label]) => label,
  );
  const highCount = product.chronicIssues.filter(
    (issue) => issue.severity === 'high',
  ).length;
  return {
    tools: tools.length ? tools : ['Cihazın sistem / tanılama menüsü'],
    difficulty:
      tools.length >= 4 || highCount >= 2
        ? 'Zor'
        : tools.length >= 2 || highCount > 0
          ? 'Orta'
          : 'Kolay',
  };
}

function lower(a: number, b: number): ComparisonSlot | null {
  return a === b ? null : a < b ? 'a' : 'b';
}
export function compareProducts(a: Product, b: Product) {
  const risks = [
    calculateHardwareRisk(a.chronicIssues),
    calculateHardwareRisk(b.chronicIssues),
  ] as const;
  const cheaper = lower(a.fairPrice, b.fairPrice);
  const lowerRisk = lower(risks[0].score, risks[1].score);
  const comparable = a.category === b.category;
  const floor = Math.min(a.fairPrice, b.fairPrice);
  // Pair-relative affordability (65%) + inverse issue index (35%). This is
  // neither a measured performance score nor a probability of device failure.
  const valueScores: readonly [number, number] | null = comparable
    ? [
        Math.round((floor / a.fairPrice) * 65 + (10 - risks[0].score) * 3.5),
        Math.round((floor / b.fairPrice) * 65 + (10 - risks[1].score) * 3.5),
      ]
    : null;
  const valueWinner: ComparisonSlot | null =
    !valueScores || valueScores[0] === valueScores[1]
      ? null
      : valueScores[0] > valueScores[1]
        ? 'a'
        : 'b';
  const device = (slot: ComparisonSlot): Product => (slot === 'a' ? a : b);
  const sameProduct = a.id === b.id;
  return {
    risks,
    cheaper,
    lowerRisk,
    comparable,
    valueScores,
    valueWinner,
    sameProduct,
    priceDifference: Math.abs(a.fairPrice - b.fairPrice),
    valueVerdict: sameProduct
      ? 'Aynı cihaz seçildi; değer karşılaştırması eşit.'
      : !comparable
        ? 'Farklı kategoriler: ortak bir değer veya performans kazananı belirlenmez.'
        : valueWinner
          ? `Fiyat/Risk Öne Çıkan: ${device(valueWinner).name}`
          : 'Fiyat/Risk değerlendirmesi: eşit puan.',
    riskVerdict: lowerRisk
      ? `Daha Az Donanımsal Risk: ${device(lowerRisk).name}`
      : 'Daha Az Donanımsal Risk: iki cihazın kayıtlı risk puanı eşit.',
    explanation: sameProduct
      ? 'Farklı bir model veya yapılandırma seçerek karşılaştırmaya başlayın.'
      : !comparable
        ? 'Fiyat ve kayıtlı sorunlar yan yana görülebilir; kullanım amacı farklı cihazlarda performans kıyası yapılmaz.'
        : cheaper && lowerRisk && cheaper !== lowerRisk
          ? 'Daha hesaplı cihaz ile daha düşük riskli cihaz farklı. Bütçe avantajını bakım ihtiyacı ve garantiyle birlikte değerlendirin.'
          : 'İlan kondisyonu, garanti ve ekspertiz sonucu bu sıralamayı değiştirebilir. Satın almadan önce her iki cihazı da test edin.',
  };
}
