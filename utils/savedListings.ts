import { getProductById } from '../data/devices';
import type { Product } from '../types/product';
import type {
  SavedItem,
  SaveListingInput,
  ValuationCondition,
} from '../types/savedListing';

export const SAVED_LISTINGS_KEY = 'secondcheck.saved-listings.v1';
export const CONDITION_FACTORS: Record<ValuationCondition, number> = {
  boxed: 1,
  device: 0.95,
  cosmetic: 0.88,
};
export const CONDITION_LABELS: Record<ValuationCondition, string> = {
  boxed: 'Kutulu / Faturalı',
  device: 'Sadece Cihaz',
  cosmetic: 'Kozmetik Kusurlu',
};
export function savedValuationCondition(item: SavedItem): ValuationCondition {
  return (
    item.valuationCondition ??
    (item.condition === 'minor_defects' ? 'cosmetic' : 'boxed')
  );
}
export function savedPriceDetails(item: SavedItem, product: Product) {
  const condition = savedValuationCondition(item);
  // Faulty devices require a repair quote; show the unadjusted market reference.
  const fairPrice =
    Math.round(
      product.fairPrice *
        (item.condition === 'faulty' ? 1 : CONDITION_FACTORS[condition]) *
        100,
    ) / 100;
  return {
    fairPrice,
    difference: Math.round((item.askedPrice - fairPrice) * 100) / 100,
    conditionLabel:
      item.condition === 'faulty'
        ? 'Arızalı • servis teklifi gerekli'
        : CONDITION_LABELS[condition],
  };
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function validFields(
  value: unknown,
): value is SaveListingInput & Record<string, unknown> {
  if (!record(value)) return false;
  return (
    typeof value.productId === 'string' &&
    !!getProductById(value.productId) &&
    typeof value.title === 'string' &&
    value.title.trim().length > 0 &&
    value.title.length <= 300 &&
    typeof value.askedPrice === 'number' &&
    Number.isFinite(value.askedPrice) &&
    value.askedPrice > 0 &&
    value.askedPrice <= Number.MAX_SAFE_INTEGER / 100 &&
    typeof value.condition === 'string' &&
    ['clean', 'minor_defects', 'faulty'].includes(value.condition) &&
    (value.valuationCondition === undefined ||
      (typeof value.valuationCondition === 'string' &&
        ['boxed', 'device', 'cosmetic'].includes(value.valuationCondition)))
  );
}
export function decodeSavedListings(raw: string | null): {
  items: SavedItem[];
  skipped: number;
} {
  if (raw === null) return { items: [], skipped: 0 };
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error('Geçersiz kayıt biçimi');
  const ids = new Set<string>();
  const items: SavedItem[] = [];
  for (const value of data as unknown[]) {
    if (
      !record(value) ||
      !validFields(value) ||
      typeof value.id !== 'string' ||
      !value.id.trim() ||
      typeof value.date !== 'string' ||
      !Number.isFinite(Date.parse(value.date)) ||
      ids.has(value.id)
    )
      continue;
    ids.add(value.id);
    items.push({
      id: value.id,
      productId: value.productId,
      title: value.title,
      askedPrice: value.askedPrice,
      condition: value.condition,
      date: value.date,
      ...(value.valuationCondition
        ? { valuationCondition: value.valuationCondition }
        : {}),
    });
  }
  return { items, skipped: data.length - items.length };
}
export function createSavedListing(
  input: SaveListingInput,
  existing: readonly SavedItem[],
  now = new Date(),
): SavedItem {
  const normalized = { ...input, title: input.title.trim().slice(0, 300) };
  if (!validFields(normalized))
    throw new Error(
      'Kaydetmek için geçerli bir ürün, başlık ve fiyat gerekir.',
    );
  const base = `listing-${now.getTime()}`;
  const ids = new Set(existing.map((item) => item.id));
  let id = base;
  let suffix = 1;
  while (ids.has(id)) id = `${base}-${suffix++}`;
  return { ...normalized, id, date: now.toISOString() };
}
