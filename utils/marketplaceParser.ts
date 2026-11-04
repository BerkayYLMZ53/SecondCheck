import { getAllDevices, getProductsForDevice, normalizeCatalogSearch } from '../data/devices';
import { normalizeDeviceModel, parseDeviceListing } from './deviceListingParser';
import { readProductUrl } from './linkParser';
import { parseListing } from './listingParser';
import type { ParsedListing } from './listingParser';

export const MARKETPLACE_MODEL_NOT_FOUND = 'İlan modeli net anlaşılamadı, lütfen listeden manuel seçin';
export type MarketplacePlatform = 'Sahibinden' | 'Dolap';
export interface MarketplaceMatch {
  platform: MarketplacePlatform;
  status: 'matched' | 'unmatched' | 'ambiguous' | 'invalid' | 'unsupported-variant' | 'concept';
  cleanedText: string;
  score: number;
  listing: ParsedListing;
  canOpenValuation: boolean;
}

export function getMarketplacePlatform(input: string): MarketplacePlatform | null {
  try {
    const url = new URL(/^www\./i.test(input.trim()) ? `https://${input.trim()}` : input.trim());
    const host = url.hostname.toLowerCase();
    if (host === 'sahibinden.com' || host.endsWith('.sahibinden.com')) return 'Sahibinden';
    if (host === 'dolap.com' || host.endsWith('.dolap.com')) return 'Dolap';
  } catch { /* Incomplete URLs do not identify a marketplace. */ }
  return null;
}

const suffixes = new Set(['pro', 'max', 'plus', 'ultra', 'mini', 'fe', 'lite', 'air']);
const modelIndex = getAllDevices().filter((d) => d.brand === 'Apple' || d.brand === 'Samsung')
  .map((device) => ({
    device,
    tokens: normalizeDeviceModel(device.model).replace(/ konsept ongoru$/, '').split(/\s+/),
  }));
const anchor = (token: string): boolean => token !== '5g' && /\d/.test(token);
const weight = (token: string): number => anchor(token) ? 60 : suffixes.has(token) ? 25 : 15;

/** Local, deterministic parser. A tie or incomplete model never becomes a guess. */
export function parseMarketplaceUrl(input: string): MarketplaceMatch | null {
  const platform = getMarketplacePlatform(input);
  if (!platform) return null;
  const listing = parseListing('');
  listing.notes = [MARKETPLACE_MODEL_NOT_FOUND];
  const result: MarketplaceMatch = { platform, status: 'invalid', cleanedText: '', score: 0, listing, canOpenValuation: false };
  let slug: string;
  try {
    const url = readProductUrl(input);
    // Host validation above prevents lookalike hosts and URLs embedded in query strings.
    const match = url.pathname.match(platform === 'Sahibinden'
      ? /^\/ilan\/([^/]+)(?:\/detay)?\/?$/i : /^\/urun\/([^/]+)\/?$/i);
    if (!match?.[1]) return result;
    slug = decodeURIComponent(match[1]);
  } catch { return result; }

  // This is Sahibinden's phone category path, not evidence of an accessory listing.
  const titleSlug = platform === 'Sahibinden'
    ? slug.replace(/^ikinci-el-ve-sifir-alisveris-cep-telefonu-aksesuar-cep-telefonu-/i, '') : slug;
  const raw = normalizeCatalogSearch(titleSlug.replace(/-\d{5,}$/, '').replace(/\b\d{5,}\b/g, ' '));
  if (/\b(?:kilif|kilifi|case|cover|koruyucu|sarj|kablo|aksesuar|karsilastir)\b/.test(raw)) {
    return { ...result, status: 'unmatched' };
  }
  const samsung = /\b(?:samsung|samsng|samsun|galaxy|s\d{1,2}(?:u|ultra|fe)?|a\d{2}s?|fold\d|flip\d)\b/.test(raw);
  const apple = /\b(?:apple|iphone|iphon|ip|ayfon)\b/.test(raw) || /\biphone\d/.test(raw) ||
    (!samsung && !/\b(?:xiaomi|redmi|poco|honor|huawei|oppo|realme|vivo|oneplus)\b/.test(raw) &&
      /\b1[1-8]\s*(?:pro\s*max|pro|max|plus|mini)\b/.test(raw));
  if (apple && samsung) return { ...result, status: 'ambiguous' };
  const cleaned = raw
    .replace(/\b(?:cep telefonu|az kullanilmis|cok temiz|sifir ayarinda)\b/g, ' ')
    .replace(/\b(?:tr|sifir|temiz|garantili|kutusunda|kutulu|faturali|acil|orijinal|ciziksiz|satilik|apple|samsung)\b/g, ' ')
    .replace(/\s+/g, ' ').trim();
  result.cleanedText = cleaned;
  const battery = parseDeviceListing(cleaned).detectedBattery;
  // Metadata numbers must not compete with the model generation or bare storage.
  const modelText = cleaned
    .replace(/\b(?:pil|batarya)(?:\s+sagligi)?\s*[:=]?\s*\d{1,3}\b/g, ' ')
    .replace(/\b\d+\s*(?:ay|yil)\b/g, ' ');
  const capacityPattern = /\b(\d+)\s*(gb|tb)\b|\b(64|128|256|512|1024)\b(?!\s*(?:tl|lira|ram)\b)/g;
  const capacities = [...modelText.matchAll(capacityPattern)].map((m) => {
    const gb = Number(m[1] ?? m[3]) * (m[2] === 'tb' ? 1024 : 1);
    return gb >= 1024 && gb % 1024 === 0 ? `${gb / 1024}TB` : `${gb}GB`;
  });
  if (new Set(capacities).size > 1) return { ...result, status: 'ambiguous' };
  const storage = capacities[0];
  const modelTitle = modelText.replace(capacityPattern, ' ');
  const modelInput = normalizeDeviceModel(apple && !/\b(?:iphone|iphon|ip|ayfon)\s*\d/.test(modelTitle)
    ? modelTitle.replace(/\b(1[1-8])\s*(pro\s*max|pro|max|plus|mini)\b/g, 'iphone $1 $2') : modelTitle)
    .replace(/\biphone\s*(\d{1,2}[se]?)\b/g, 'iphone $1');
  const words = new Set(modelInput.split(/\s+/).filter(Boolean));
  if ((modelInput.match(/\biphone\b/g)?.length ?? 0) > 1 ||
      (modelInput.match(/\bs\d{1,2}\b/g)?.length ?? 0) > 1) return { ...result, status: 'ambiguous' };
  if (apple) words.add('iphone');
  const inputSuffixes = [...words].filter((w) => suffixes.has(w));
  const inputAnchors = [...words].filter(anchor);
  const candidates = modelIndex.map(({ device, tokens }) => {
    if ((apple && device.brand !== 'Apple') || (samsung && device.brand !== 'Samsung')) return null;
    if (!apple && device.brand === 'Apple') return null;
    if ((!tokens.filter(anchor).length && !tokens.some((w) => ['x', 'xr', 'xs', 'air'].includes(w))) ||
        inputAnchors.some((w) => !tokens.includes(w))) return null;
    if (inputSuffixes.some((w) => !tokens.includes(w))) return null;
    // Omit 5G only where no separate 4G model has the same name.
    const required = tokens.filter((w) => w !== '5g' || modelIndex.some((other) =>
      other.device.id !== device.id && other.tokens.join(' ') === tokens.filter((t) => t !== '5g').join(' ')));
    const points = required.reduce((sum, w) => sum + (words.has(w) ? weight(w) : 0), 0);
    const maximum = required.reduce((sum, w) => sum + weight(w), 0);
    if (!required.every((w) => words.has(w))) return null;
    return { device, points, score: Math.round(points / maximum * 100) };
  }).filter((candidate) => candidate !== null).sort((a, b) => b.points - a.points);
  const best = candidates[0];
  if (!best) return { ...result, status: 'unmatched' };
  if (candidates[1]?.points === best.points) return { ...result, status: 'ambiguous' };
  listing.matchedDevice = best.device;
  if (storage) listing.detectedStorage = storage;
  if (battery !== undefined) listing.detectedBattery = battery;
  listing.product = getProductsForDevice(best.device.id, storage)[0] ?? null;
  listing.notes = ['Model yerel ilan adresinden tanındı; fiyat ve kondisyon doğrulanmadı.'];
  const status = best.device.releaseYear === 0 ? 'concept'
    : storage && !best.device.variants.storage.includes(storage) ? 'unsupported-variant' : 'matched';
  if (status !== 'matched') listing.notes.push(MARKETPLACE_MODEL_NOT_FOUND);
  return { ...result, status, score: best.score, canOpenValuation: status === 'matched' && listing.product !== null };
}
