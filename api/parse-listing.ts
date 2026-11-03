import { fetchListingMetadata, ListingFetchError, readLimitedText } from '../server/listingMetadata';
import type { ListingMetadataResponse } from '../types/listing';

function json(body: ListingMetadataResponse, status: number, extraHeaders?: HeadersInit): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...extraHeaders } });
}

/** Vercel Node.js Web Standard handler; no platform-specific runtime dependency. */
async function POST(request: Request): Promise<Response> {
  try {
    let body: unknown;
    try {
      body = JSON.parse(await readLimitedText(request, 4096));
    } catch (error) {
      if (error instanceof ListingFetchError) throw error;
      return json({ success: false, code: 'INVALID_REQUEST', error: 'İstek geçerli JSON biçiminde olmalıdır.' }, 400);
    }
    if (typeof body !== 'object' || body === null || !('url' in body) ||
        typeof body.url !== 'string' || !body.url.trim()) {
      return json({ success: false, code: 'INVALID_REQUEST', error: 'url alanında bir ilan bağlantısı gönderin.' }, 400);
    }
    return json(await fetchListingMetadata(body.url.trim()), 200);
  } catch (error) {
    if (error instanceof ListingFetchError) {
      return json({ success: false, code: error.code, error: error.message }, error.status);
    }
    return json({ success: false, code: 'FETCH_FAILED', error: 'İlan bilgileri alınamadı. İlan metnini yapıştırarak devam edin.' }, 502);
  }
}

export default {
  fetch(request: Request): Promise<Response> | Response {
    if (request.method === 'POST') return POST(request);
    return json({ success: false, code: 'METHOD_NOT_ALLOWED', error: 'Bu adres yalnızca POST isteklerini kabul eder.' }, 405, { Allow: 'POST' });
  },
};
