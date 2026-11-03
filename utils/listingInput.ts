import { parseListing } from './listingParser';
import { compareDevicePrice } from './deviceListingParser';
import type { ParsedListing } from './listingParser';
import type { ListingMetadata } from '../types/listing';

export interface ListingInputResult {
  listing: ParsedListing;
  title: string;
  metadata?: ListingMetadata;
}

function isMetadata(value: unknown): value is ListingMetadata {
  return typeof value === 'object' && value !== null &&
    'success' in value && value.success === true &&
    'title' in value && typeof value.title === 'string' &&
    'description' in value && typeof value.description === 'string' &&
    'image' in value && (value.image === null || typeof value.image === 'string') &&
    'rawPrice' in value && (value.rawPrice === null || typeof value.rawPrice === 'string');
}

function metadataPrice(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const value = raw.trim();
  // OG numeric amounts use a decimal dot; listing text uses Turkish separators.
  const numeric = /^\d+(?:[.,]\d{1,2})?$/.test(value)
    ? Number(value.replace(',', '.'))
    : /^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(value)
      ? Number(value.replace(/\./g, '').replace(',', '.')) : NaN;
  return Number.isFinite(numeric) && numeric > 0 && numeric <= Number.MAX_SAFE_INTEGER / 100 ? numeric : undefined;
}

/** Text stays local; URL metadata goes through the same-origin Vercel endpoint. */
export async function parseListingInput(
  input: string,
  apiEndpoint = '/api/parse-listing',
  signal?: AbortSignal,
): Promise<ListingInputResult> {
  const text = input.trim().slice(0, 12000);
  if (!/^https?:\/\/\S+$/i.test(text)) {
    if (/^[a-z][a-z\d+.-]*:\/\//i.test(text)) throw new Error('Geçerli bir HTTP/HTTPS ilan bağlantısı girin veya ilan metnini yapıştırın.');
    return { listing: parseListing(text), title: text.split(/\r?\n/)[0]?.slice(0, 300) ?? '' };
  }
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 12000);
  try {
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: text }),
      signal: controller.signal,
    });
    const metadata: unknown = await response.json();
    if (!response.ok || !isMetadata(metadata)) {
      const message = typeof metadata === 'object' && metadata !== null &&
        'error' in metadata && typeof metadata.error === 'string' ? metadata.error
        : 'İlan bilgileri alınamadı. İlan metnini yapıştırarak devam edin.';
      throw new Error(message);
    }
    const listing = parseListing(`${metadata.title}\n${metadata.description}`);
    const price = metadataPrice(metadata.rawPrice);
    if (price !== undefined) {
      listing.price = price;
      listing.detectedPrice = price;
      const comparison = compareDevicePrice(listing.matchedDevice, price);
      if (comparison) listing.priceComparison = comparison;
      else delete listing.priceComparison;
      listing.notes = listing.notes.filter((note) => !note.startsWith('Fiyat bulunamadı') && !note.startsWith('Birden fazla fiyat'));
    }
    return { listing, title: metadata.title.slice(0, 300), metadata };
  } catch (error) {
    if (controller.signal.aborted) throw new Error('İlan sitesinden yanıt alınamadı. İlan metnini yapıştırarak devam edin.');
    if (error instanceof Error && !(error instanceof SyntaxError) && !(error instanceof TypeError)) throw error;
    throw new Error('İlan bilgileri alınamadı. İlan metnini yapıştırarak devam edin.');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
