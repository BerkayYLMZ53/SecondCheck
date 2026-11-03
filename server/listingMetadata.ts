import type { ListingMetadata, ListingMetadataError } from '../types/listing';

const MAX_PAGE_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 3;
// Restrict this endpoint to marketplace hosts instead of exposing an open proxy.
const MARKETPLACE_HOSTS = ['sahibinden.com', 'shbd.io', 'dolap.com', 'letgo.com', 'gardrops.com'];

export class ListingFetchError extends Error {
  constructor(
    public readonly code: ListingMetadataError['code'],
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export function validateListingUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ListingFetchError('INVALID_URL', 'Geçerli bir ilan bağlantısı girin veya ilan metnini yapıştırın.', 400);
  }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password ||
      (url.port && url.port !== '80' && url.port !== '443') || value.length > 2048) {
    throw new ListingFetchError('INVALID_URL', 'Bağlantı desteklenen bir HTTP/HTTPS ilan adresi olmalıdır.', 400);
  }
  const host = url.hostname.toLowerCase();
  if (!MARKETPLACE_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))) {
    throw new ListingFetchError('UNSUPPORTED_HOST', 'Bu ilan sitesi desteklenmiyor. İlan başlığını ve açıklamasını yapıştırarak devam edin.', 400);
  }
  url.hash = '';
  return url;
}

export async function readLimitedText(response: Request | Response, maxBytes: number): Promise<string> {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    await response.body?.cancel();
    throw new ListingFetchError('PAGE_TOO_LARGE', 'İçerik izin verilen boyutu aşıyor. İlan metnini yapıştırın.', 413);
  }
  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new ListingFetchError('PAGE_TOO_LARGE', 'İçerik izin verilen boyutu aşıyor. İlan metnini yapıştırın.', 413);
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

function decodeEntities(value: string): string {
  const named: Record<string, string> = {
    amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ',
    ccedil: 'ç', Ccedil: 'Ç', ouml: 'ö', Ouml: 'Ö', uuml: 'ü', Uuml: 'Ü',
    hellip: '…', ndash: '–', mdash: '—',
  };
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (original: string, entity: string) => {
    if (!entity.startsWith('#')) return named[entity] ?? original;
    const hexadecimal = entity[1]?.toLowerCase() === 'x';
    const code = parseInt(entity.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
    return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
      ? String.fromCodePoint(code) : original;
  });
}

function cleanText(value: string): string {
  return decodeEntities(value).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/** Attribute order, case, quoting style, entities and > inside quotes are supported. */
export function extractListingMetadata(html: string, pageUrl: string): ListingMetadata {
  const content = html.replace(/<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '');
  const meta = new Map<string, string>();
  for (const tag of content.matchAll(/<meta\b(?:"[^"]*"|'[^']*'|[^'">])*>/gi)) {
    const attributes = new Map<string, string>();
    for (const attr of tag[0].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g)) {
      attributes.set((attr[1] ?? '').toLowerCase(), attr[2] ?? attr[3] ?? attr[4] ?? '');
    }
    const key = (attributes.get('property') ?? attributes.get('name'))?.toLowerCase();
    const value = attributes.get('content');
    if (key && value?.trim() && !meta.has(key)) meta.set(key, value);
  }
  const title = cleanText(meta.get('og:title') ?? content.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1] ?? '').slice(0, 500);
  const description = cleanText(meta.get('og:description') ?? meta.get('description') ?? '').slice(0, 11000);
  if (!title || /just a moment|attention required|access denied|captcha|erişim engellendi|access to this page has been denied/i.test(title)) {
    throw new ListingFetchError('NO_METADATA', 'İlan bilgileri alınamadı. İlan başlığını ve açıklamasını yapıştırarak devam edin.', 422);
  }
  let image: string | null = null;
  const rawImage = meta.get('og:image') ?? meta.get('og:image:secure_url');
  if (rawImage) {
    try {
      const url = new URL(decodeEntities(rawImage), pageUrl);
      if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) image = url.href;
    } catch { /* An invalid optional image must not fail text extraction. */ }
  }
  const rawPrice = meta.get('og:price:amount') ?? meta.get('product:price:amount') ?? meta.get('price');
  return { success: true, title, description, image, rawPrice: rawPrice ? cleanText(rawPrice).slice(0, 100) : null };
}

export async function fetchListingMetadata(value: string): Promise<ListingMetadata> {
  let url = validateListingUrl(value);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
      const response = await fetch(url.href, {
        method: 'GET',
        headers: { 'User-Agent': 'Twitterbot/1.0', Accept: 'text/html,application/xhtml+xml' },
        redirect: 'manual',
        signal: controller.signal,
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        await response.body?.cancel();
        if (!location || redirects === MAX_REDIRECTS) break;
        url = validateListingUrl(new URL(location, url).href);
        continue;
      }
      const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
      if (!response.ok || !/^(?:text\/html|application\/xhtml\+xml)(?:;|$)/.test(contentType)) {
        await response.body?.cancel();
        throw new ListingFetchError('FETCH_FAILED', 'Site ilan sayfasını paylaşmadı. İlan metnini yapıştırarak devam edin.', 502);
      }
      return extractListingMetadata(await readLimitedText(response, MAX_PAGE_BYTES), url.href);
    }
    throw new ListingFetchError('FETCH_FAILED', 'İlan bağlantısında çok fazla yönlendirme var. İlan metnini yapıştırın.', 502);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new ListingFetchError('TIMEOUT', 'İlan sitesi zamanında yanıt vermedi. İlan metnini yapıştırarak devam edin.', 504);
    }
    if (error instanceof ListingFetchError) throw error;
    throw new ListingFetchError('FETCH_FAILED', 'İlan sayfasına ulaşılamadı. İlan metnini yapıştırarak devam edin.', 502);
  } finally {
    clearTimeout(timer);
  }
}
