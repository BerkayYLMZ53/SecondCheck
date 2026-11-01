import { PRODUCTS_DATABASE } from '../data/mockProducts';
import type { Category, Product } from '../types/product';

export type ListingCondition = 'boxed' | 'device' | 'cosmetic';
export interface ListingFinding {
  kind:
    | 'cosmetic'
    | 'missing-box'
    | 'missing-invoice'
    | 'battery'
    | 'replacement'
    | 'invoice'
    | 'box';
  label: string;
  warning: boolean;
}
export interface ParsedListing {
  product: Product | null;
  price: number | null;
  condition: ListingCondition;
  findings: ListingFinding[];
  notes: string[];
}

function fold(text: string): string {
  return text
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
}
function normalize(text: string): string {
  return fold(text)
    .replace(/\+/g, ' plus ')
    .replace(/promax/g, 'pro max')
    .replace(/playstation/g, 'ps')
    .replace(/\b(iphone|rtx|gtx|rx|ps|galaxy)\s*(\d)/g, '$1 $2')
    .replace(/(\d)\s*(ti|super|x3d|xt|kf|x|k|f|g)\b/g, '$1$2')
    .replace(/(\d)\s*(gb|tb|mhz|hz)\b/g, '$1$2')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
const tokens = (text: string): string[] =>
  normalize(text).split(' ').filter(Boolean);
const qualifiers = new Set([
  'ti',
  'super',
  'pro',
  'max',
  'plus',
  'ultra',
  'mini',
  'air',
  'oled',
  'lcd',
  'slim',
  'fat',
  'digital',
  'disc',
  'extreme',
]);
const index = PRODUCTS_DATABASE.map((product) => {
  const base = tokens(product.name.split('(')[0] ?? product.name);
  return {
    product,
    full: normalize(product.name),
    base,
    all: new Set(tokens(product.name)),
    anchors: base.filter(
      (token) =>
        /\d/.test(token) &&
        !/^i[3579]$/.test(token) &&
        !(product.category === 'cpu' && /^[3579]$/.test(token)),
    ),
    brandWords: new Set(tokens(product.brand)),
  };
});

function categoryHint(text: string): Category | undefined {
  if (/\b(steam deck|rog ally|legion go)\b/.test(text)) return 'handheld';
  if (
    /\b(anakart|motherboard)\b|\b(?:b450|b550|b650|b660|b760|x570|x670|z690|z790)[a-z]?\b/.test(
      text,
    )
  )
    return 'motherboard';
  if (/\bm[1-4]\b/.test(text) && /\b(air|pro)\b/.test(text)) return 'laptop';
  if (
    /\b(macbook|laptop|dizustu|notebook|abra|tulpar|legion|nitro|predator|helios|victus|ideapad)\b|\b(rog strix|asus tuf|hp omen)\b/.test(
      text,
    )
  )
    return 'laptop';
  if (/\b(ram|ddr4|ddr5|bellek)\b/.test(text)) return 'ram';
  if (/\b(ryzen|islemci|cpu|i[3579])\b/.test(text)) return 'cpu';
  if (
    /\b(iphone|galaxy|redmi|xiaomi|telefon|s9|s10|s20|s21|s22|s23|s24)\b/.test(
      text,
    )
  )
    return 'phone';
  if (/\b(ps|xbox|nintendo|switch)\b/.test(text)) return 'console';
  if (/\b(monitor|ekran paneli)\b/.test(text)) return 'monitor';
  if (/\b(rtx|gtx|rx|gpu|ekran karti)\b/.test(text)) return 'gpu';
  return undefined;
}

function matchProduct(text: string): Product | null {
  if (/^\s*\d{5,}\s*$/.test(text)) return null;
  const normalized = normalize(text);
  // Full catalog titles are unambiguous, including otherwise ambiguous DDR / GPU specs.
  const exact = index
    .filter((entry) => ` ${normalized} `.includes(` ${entry.full} `))
    .sort((a, b) => b.full.length - a.full.length)[0];
  if (exact) return exact.product;
  const words = new Set(tokens(text));
  const listingQualifiers = [...words].filter((word) => qualifiers.has(word));
  const capacities = [...words].filter((word) => /^\d+(?:gb|tb)$/.test(word));
  const hint = categoryHint(normalized);
  const family = [
    'iphone',
    'macbook',
    'galaxy',
    'redmi',
    'xbox',
    'ryzen',
    'rtx',
    'gtx',
  ].find((word) => words.has(word));
  let best: Product | null = null;
  let bestScore = -Infinity;
  for (const entry of index) {
    if (hint && entry.product.category !== hint) continue;
    if (family && !entry.all.has(family)) continue;
    const matchedAnchors = entry.anchors.filter((anchor) => words.has(anchor));
    // A brand alone or a generic description must never pick an arbitrary model.
    const symbolic = entry.base.filter(
      (word) => !entry.brandWords.has(word) && !qualifiers.has(word),
    );
    const namedMatch =
      entry.anchors.length === 0 &&
      symbolic.every((word) => words.has(word)) &&
      (symbolic.length >= 2 || entry.base.every((word) => words.has(word)));
    if (!matchedAnchors.length && !namedMatch) continue;
    if (
      !hint &&
      !namedMatch &&
      !matchedAnchors.some(
        (anchor) =>
          /\d{3,}/.test(anchor) ||
          (/[a-z]/.test(anchor) && /\d/.test(anchor) && anchor.length >= 4),
      )
    )
      continue;
    // Avoid a model suffix collision, e.g. iPhone 13 vs 13 Pro or Ryzen 5600 vs 5600X.
    let score =
      (namedMatch ? 20 : matchedAnchors.length * 20) -
      (entry.anchors.length - matchedAnchors.length) * 16;
    for (const word of entry.base) {
      if (words.has(word)) score += qualifiers.has(word) ? 14 : 4;
    }
    score -= Math.min(
      10,
      entry.base.filter((word) => qualifiers.has(word) && !words.has(word))
        .length * 18,
    );
    for (const word of listingQualifiers) {
      if (!entry.all.has(word)) score -= 18;
    }
    for (const word of entry.all)
      if (words.has(word) && !entry.base.includes(word)) score += 6;
    // Explicit capacities must beat colors, bundle names or catalog order.
    score += capacities.reduce(
      (sum, word) => sum + (entry.all.has(word) ? 24 : -32),
      0,
    );
    if (score > bestScore) {
      bestScore = score;
      best = entry.product;
    }
  }
  return bestScore >= 18 ? best : null;
}

interface PriceCandidate {
  value: number;
  start: number;
  end: number;
  labeled: boolean;
}
const NUMBER = '(?:\\d{1,3}(?:[. \\u00a0]\\d{3})+|\\d+)(?:,\\d{1,2})?';
function priceValue(raw: string): number | null {
  const value = Number(raw.replace(/[.\s\u00a0]/g, '').replace(',', '.'));
  return Number.isFinite(value) &&
    value > 0 &&
    value <= Number.MAX_SAFE_INTEGER / 100
    ? value
    : null;
}
function explicitPrices(text: string): PriceCandidate[] {
  const candidates: PriceCandidate[] = [];
  const patterns = [
    {
      pattern: new RegExp(
        `(?<![\\w.,])(${NUMBER})\\s*(?:tl|₺|lira)(?![a-z])`,
        'giu',
      ),
      labeled: false,
    },
    {
      pattern: new RegExp(`₺\\s*(${NUMBER})(?![\\d.,])`, 'gu'),
      labeled: false,
    },
    {
      pattern: new RegExp(
        `\\b(?:son fiyat|fiyat[i]?|bedel|nakit)\\s*[:=\\-]?\\s*(${NUMBER})(?![\\d.,])`,
        'giu',
      ),
      labeled: true,
    },
  ];
  for (const { pattern, labeled } of patterns)
    for (const match of text.matchAll(pattern)) {
      const value = priceValue(match[1] ?? '');
      if (value !== null)
        candidates.push({
          value,
          start: match.index,
          end: match.index + match[0].length,
          labeled,
        });
    }
  return candidates;
}
function selectPrice(values: number[], notes: string[]): number | null {
  const distinct = [...new Set(values)];
  if (distinct.length > 1)
    notes.push('Birden fazla fiyat bulundu; ilan fiyatını elle girin.');
  return distinct.length === 1 ? (distinct[0] ?? null) : null;
}
function barePrice(
  text: string,
  product: Product | null,
  notes: string[],
): number | null {
  const modelWords = new Set(tokens(product?.name ?? ''));
  const modelNumbers = new Set(
    [...modelWords].flatMap((word) => word.match(/\d+/g) ?? []),
  );
  const values: number[] = [];
  for (const match of text.matchAll(
    new RegExp(`(?<![a-z0-9.,])(${NUMBER})(?![a-z0-9.,])`, 'gi'),
  )) {
    const raw = match[1] ?? '';
    const value = priceValue(raw);
    const after = text.slice(
      match.index + raw.length,
      match.index + raw.length + 16,
    );
    const before = text.slice(Math.max(0, match.index - 20), match.index);
    if (
      value === null ||
      value < 100 ||
      /^(?:\s*)(?:gb|tb|mb|mhz|hz|mt|w|inc|%|ay|yil|taksit)\b/.test(after)
    )
      continue;
    if (
      /\b(?:pil|batarya|sagligi|imei|telefon|tel|model|yil|seri)\s*[:%]?\s*$/.test(
        before,
      )
    )
      continue;
    if (value >= 1900 && value <= 2099 && !raw.includes('.')) continue;
    if (
      modelNumbers.has(raw) ||
      modelWords.has(raw) ||
      modelWords.has(raw.replace(/\s/g, ''))
    )
      continue;
    if (raw.replace(/[^0-9]/g, '').length > 9) continue;
    values.push(value);
  }
  return selectPrice(values, notes);
}

function extractFindings(text: string): ListingFinding[] {
  const findings: ListingFinding[] = [];
  const add = (finding: ListingFinding) => findings.push(finding);
  const clauses = text.split(/[\n.;!]+|\b(?:ama|fakat|ancak)\b/);
  if (
    [
      ...text.matchAll(
        /\b(?:cizik|cizikler|cizikli|catlak|catlaklar|catlakli|ezik|ezikler|ezikli|kozmetik kusur)\b/g,
      ),
    ].some(
      (match) =>
        !/^\s*(?:yok|yoktur|bulunmuyor|bulunmaz|degil)\b/.test(
          text.slice(match.index + match[0].length),
        ),
    )
  ) {
    add({
      kind: 'cosmetic',
      label: 'Kozmetik kusur belirtilmiş',
      warning: true,
    });
  }
  const noBox =
    /\b(?:kutu(?:su)?\s*(?:yok|yoktur|bulunmuyor)|kutusuz|sadece cihaz)\b/.test(
      text,
    );
  const noInvoice =
    /\b(?:fatura(?:si)?\s*(?:yok|yoktur|bulunmuyor)|faturasiz)\b/.test(text);
  if (noBox)
    add({
      kind: 'missing-box',
      label: 'Kutu yok / sadece cihaz',
      warning: true,
    });
  else if (/\b(?:kutulu|kutu(?:su)?\s*(?:var|mevcut))\b/.test(text))
    add({ kind: 'box', label: 'Kutu var', warning: false });
  if (noInvoice)
    add({ kind: 'missing-invoice', label: 'Fatura yok', warning: true });
  else if (/\b(?:faturali|fatura(?:si)?\s*(?:var|mevcut))\b/.test(text))
    add({ kind: 'invoice', label: 'Fatura var', warning: false });
  const battery = text.match(
    /\b(?:pil|batarya)(?:\s+sagligi)?\s*[:=%]?\s*(\d{1,3})\s*%?/,
  );
  const percent = Number(battery?.[1]);
  if (battery && percent >= 1 && percent <= 100)
    add({
      kind: 'battery',
      label: `Pil sağlığı: %${percent}${percent < 80 ? ' • servis ihtiyacını kontrol edin' : ''}`,
      warning: percent < 80,
    });
  if (
    clauses.some(
      (clause) =>
        /\b(?:degisen|degismis|degisti|degistirildi|degisimli)\b/.test(
          clause,
        ) &&
        !/\b(?:degisen|degismis)\s*(?:yok|yoktur|parca yok|degil)\b/.test(
          clause,
        ),
    )
  ) {
    add({
      kind: 'replacement',
      label: 'Parça değişimi belirtilmiş • orijinalliği doğrulayın',
      warning: true,
    });
  }
  return findings;
}

/** Local deterministic text parsing; no marketplace requests or network calls. */
export function parseListing(text: string): ParsedListing {
  const input = fold(text.trim().slice(0, 12000));
  const notes: string[] = [];
  const explicit = explicitPrices(input);
  let modelText = input;
  for (const candidate of [...explicit].sort((a, b) => b.start - a.start)) {
    // Preserve positions while masking amounts so prices cannot become model numbers.
    modelText =
      modelText.slice(0, candidate.start) +
      ' '.repeat(candidate.end - candidate.start) +
      modelText.slice(candidate.end);
  }
  const product = matchProduct(modelText);
  const preferred = explicit.some((candidate) => candidate.labeled)
    ? explicit.filter((candidate) => candidate.labeled)
    : explicit;
  const price = preferred.length
    ? selectPrice(
        preferred.map((candidate) => candidate.value),
        notes,
      )
    : barePrice(input, product, notes);
  const findings = extractFindings(input);
  const condition: ListingCondition = findings.some(
    (finding) => finding.kind === 'cosmetic',
  )
    ? 'cosmetic'
    : findings.some(
          (finding) =>
            finding.kind === 'missing-box' ||
            finding.kind === 'missing-invoice',
        )
      ? 'device'
      : 'boxed';
  if (!product)
    notes.push(
      'Katalogda güvenilir bir ürün eşleşmesi bulunamadı. Marka ve model adını ekleyin.',
    );
  else
    notes.push(
      'En yakın katalog varyantı seçildi; kapasite, marka ve paket içeriğini doğrulayın.',
    );
  if (price === null && !notes.some((note) => note.startsWith('Birden fazla')))
    notes.push(
      'Fiyat bulunamadı. İlan fiyatını TL olarak ekleyin veya aşağıdan elle girin.',
    );
  if (
    findings.some(
      (finding) => finding.kind === 'battery' || finding.kind === 'replacement',
    )
  )
    notes.push(
      'Pil ve parça değişimi uyarıları fiyat katsayısına otomatik eklenmez; yerinde kontrol edin.',
    );
  return { product, price, condition, findings, notes };
}
