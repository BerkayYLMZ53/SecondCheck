export interface PriceCandidate {
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
export function explicitPrices(text: string): PriceCandidate[] {
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
export function selectPrice(values: number[], notes: string[]): number | null {
  const distinct = [...new Set(values)];
  if (distinct.length > 1)
    notes.push('Birden fazla fiyat bulundu; ilan fiyatını elle girin.');
  return distinct.length === 1 ? (distinct[0] ?? null) : null;
}
export function barePrice(
  text: string,
  modelTokens: readonly string[],
  notes: string[],
): number | null {
  const modelWords = new Set(modelTokens);
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

