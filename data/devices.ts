import { PRODUCTS_DATABASE as legacyProducts } from './mockProducts';
import { getAllDevices } from '../utils/catalogHelper';
import type { DeviceItem } from '../types/catalog';
import type { Product } from '../types/product';

// Public catalog entry point for screens, parsers and saved-listing lookups.
// The legacy generator remains an internal compatibility source for stable IDs.
export { getAllDevices, getDeviceById, searchDevices, filterByBrand } from '../utils/catalogHelper';

export function normalizeCatalogSearch(value: string): string {
  return value.toLocaleLowerCase('tr-TR').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i')
    .replace(/(\d+)\s*(gb|tb)\b/g, '$1$2')
    .replace(/\+/g, ' plus ').replace(/[^a-z0-9]+/g, ' ').trim();
}

function modelKey(value: string): string {
  return normalizeCatalogSearch(value)
    .replace(/\b(?:apple|samsung|xiaomi|galaxy)\b/g, '')
    .replace(/se\s*\(?(2020|2nd generation)\)?/g, 'se 2')
    .replace(/se\s*\(?(2022|3rd generation)\)?/g, 'se 3')
    .replace(/se\s*1st generation/g, 'se 1')
    .replace(/\s+/g, '');
}

function catalogProduct(device: DeviceItem, storage?: string): Product {
  const id = storage ? `${device.id}-${storage.toLowerCase()}` : device.id;
  const name = device.model.toLowerCase().startsWith(device.brand.toLowerCase())
    ? device.model : `${device.brand} ${device.model}`;
  return {
    id, name: storage ? `${name} (${storage})` : name,
    brand: device.brand, category: 'phone', releaseYear: device.releaseYear,
    // Model-level estimates: capacity/color premiums are deliberately not invented.
    marketPriceMin: device.estimatedPriceBand.minTry,
    fairPrice: device.estimatedPriceBand.avgTry,
    marketPriceMax: device.estimatedPriceBand.maxTry,
    chronicIssues: device.chronicIssues.map((description, index) => ({
      id: `${id}-issue-${index + 1}`, title: description, description,
      severity: 'medium', estimatedRepairCost: 'Teşhis sonrası güncel servis teklifi alın.',
    })),
    checklist: device.criticalChecks.map((instruction, index) => ({
      id: `${id}-check-${index + 1}`, title: instruction, instruction,
      targetArea: 'Cihaz kontrolü',
    })),
    alternatives: [],
  };
}

const models = getAllDevices();
// The old generator grouped Redmi under Xiaomi; use the model catalog's brand
// without changing IDs, price estimates, inspection data or stored references.
const compatibleProducts = legacyProducts.map((product) =>
  product.category === 'phone' && product.brand === 'Xiaomi' && /\bRedmi\b/.test(product.name)
    ? { ...product, brand: 'Redmi' } : product);
const existingCapacities = new Set(compatibleProducts.filter((p) => p.category === 'phone').map((p) => {
  // SE names contain parentheses before the capacity, so split at the final variant.
  const base = p.name.replace(/ \([^()]*\)$/, '');
  const storage = p.name.match(/\((\d+(?:GB|TB))\s*(?:\/|\))/)?.[1] ?? '';
  return `${modelKey(base)}:${storage}`;
}));
const additions = models.filter((d) => d.releaseYear > 0 && d.estimatedPriceBand.avgTry > 0)
  .flatMap((device) => device.variants.storage
    .filter((storage) => !existingCapacities.has(`${modelKey(device.model)}:${storage}`))
    .map((storage) => catalogProduct(device, storage)));

/** All valuatable variants, including old IDs referenced by saved listings. */
export const PRODUCTS_DATABASE: Product[] = [...compatibleProducts, ...additions];
/** Includes unpriced concept entries for discovery, never for valuation. */
export const BROWSABLE_PRODUCTS: Product[] = [
  ...PRODUCTS_DATABASE,
  ...models.filter((d) => d.releaseYear === 0 || d.estimatedPriceBand.avgTry <= 0)
    .map((d) => catalogProduct(d)),
];
const byId = new Map(PRODUCTS_DATABASE.map((p) => [p.id, p]));
if (new Set(BROWSABLE_PRODUCTS.map((p) => p.id)).size !== BROWSABLE_PRODUCTS.length) {
  throw new Error('Cihaz kataloğunda tekrarlanan ürün kimliği.');
}
export function getProductById(id: string): Product | undefined { return byId.get(id); }

const modelsByKey = new Map(models.map((d) => [modelKey(d.model), d]));
const index = BROWSABLE_PRODUCTS.map((product) => {
  const device = product.category === 'phone'
    ? modelsByKey.get(modelKey(product.name.replace(/ \([^()]*\)$/, ''))) : undefined;
  const text = normalizeCatalogSearch(`${product.name} ${product.brand} ${product.id} ${device?.model ?? ''}`);
  return { product, words: text.split(' '), compact: text.replace(/\s+/g, '') };
});

/** Shared unlimited search; pagination belongs to the UI, after all filters. */
export function searchCatalogProducts(query = '', category = 'all', brand = 'all'): Product[] {
  const normalized = normalizeCatalogSearch(query);
  if (query.trim() && !normalized) return [];
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const compact = normalized.replace(/\s+/g, '');
  const brandKey = normalizeCatalogSearch(brand);
  return index.filter(({ product, words, compact: candidate }) =>
    (category === 'all' || product.category === category) &&
    (brandKey === 'all' || normalizeCatalogSearch(product.brand) === brandKey) &&
    (tokens.every((token) => words.some((word) => word.startsWith(token) &&
      (!/^\d+$/.test(token) || !/\d/.test(word.charAt(token.length))))) || candidate.includes(compact)),
  ).map(({ product }) => product);
}

/** Compatibility search for callers that need only valuatable products. */
export function searchProducts(query: string, category = 'all', limit = 50): Product[] {
  if (!Number.isFinite(limit) || limit <= 0) return [];
  return searchCatalogProducts(query, category).filter((p) => p.fairPrice > 0)
    .slice(0, Math.floor(limit));
}
