import { getProductsForDevice, normalizeCatalogSearch } from '../data/devices';
import { parseListing } from './listingParser';
import type { ParsedListing } from './listingParser';

export const MODEL_NOT_FOUND = 'Model tespit edilemedi, lütfen manuel seçin';

/** Accept one HTTP(S) URL (including a copied www. address), never embedded links. */
export function isLinkInput(input: string): boolean {
  return /^(?:https?:\/\/|www\.)\S+$/i.test(input.trim());
}

export function readProductUrl(input: string): URL {
  const text = input.trim();
  if (!isLinkInput(text) || text.length > 2048) throw new Error('Geçerli bir HTTP/HTTPS ürün bağlantısı girin.');
  let url: URL;
  try { url = new URL(/^www\./i.test(text) ? `https://${text}` : text); }
  catch { throw new Error('Geçerli bir HTTP/HTTPS ürün bağlantısı girin.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      (url.port && url.port !== '80' && url.port !== '443')) {
    throw new Error('Geçerli bir HTTP/HTTPS ürün bağlantısı girin.');
  }
  url.hash = '';
  return url;
}

/** Reconcile the model parser with the exact model/storage in the shared catalog. */
export function matchDeviceText(text: string): ParsedListing {
  const listing = parseListing(text);
  const title = normalizeCatalogSearch(text.split('\n')[0] ?? text);
  if (/\b(?:kilif|kilifi|case|cover|screen protector|ekran koruyucu|sarj|kablo|aksesuar|compare|karsilastir)\b/.test(title)) {
    listing.matchedDevice = null;
    listing.product = null;
    return listing;
  }
  if (listing.matchedDevice) {
    listing.product = getProductsForDevice(listing.matchedDevice.id, listing.detectedStorage)[0] ?? null;
  } else if (listing.product?.category === 'phone') {
    // An ambiguous/unsupported phone suffix must not fall back to a guessed phone.
    listing.product = null;
  }
  return listing;
}

export function parseProductUrl(input: string): { url: URL; text: string; listing: ParsedListing } {
  const url = readProductUrl(input);
  let pathname = url.pathname;
  try { pathname = decodeURIComponent(pathname); } catch { /* Keep malformed escapes literal. */ }
  const text = pathname
    // Website IDs and tracking parameters are never asking prices or model evidence.
    .replace(/\b\d{5,}\b/g, ' ')
    .replace(/[-_/]+/g, ' ')
    .replace(/\s+/g, ' ').trim().slice(0, 2000);
  const listing = matchDeviceText(text);
  listing.price = null;
  delete listing.detectedPrice;
  delete listing.priceComparison;
  listing.notes = ['Model bağlantı adresinden tespit edildi; ilan fiyatı ve kondisyonu doğrulanmadı.'];
  return { url, text, listing };
}
