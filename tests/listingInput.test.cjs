/* global __dirname */
const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const createLoader = require('./helpers/loadTypeScript.cjs');
const inputPath = path.resolve(__dirname, '../utils/listingInput.ts');
const metadata = {
  success: true,
  title: 'ip 13 pm 256GB kutulu',
  description: 'Pil sağlığı %85, faturalı, ekran değişti',
  image: null,
  rawPrice: '25000.00',
};

test('an already cancelled analysis never publishes local text or URL results', async () => {
  const { parseListingInput } = createLoader({ fetch: () => assert.fail('cancelled request must not fetch') })(inputPath);
  const controller = new AbortController();
  controller.abort();
  for (const input of ['iphone 13 256GB', 'https://www.sahibinden.com/ilan/iphone-13-123456789/detay']) {
    await assert.rejects(parseListingInput(input, undefined, controller.signal), /iptal/);
  }
});

test('cancellation while response JSON is being read discards metadata', async () => {
  const controller = new AbortController();
  const { parseListingInput } = createLoader({ fetch: async () => ({
    ok: true,
    json: async () => { controller.abort(); return metadata; },
  }) })(inputPath);
  await assert.rejects(parseListingInput('https://letgo.com/item/test', undefined, controller.signal));
});

test('text parsing works offline and preserves the legacy product result', async () => {
  const { parseListingInput } = createLoader({ fetch: () => assert.fail('text must stay local') })(inputPath);
  const { listing, title, metadata } = await parseListingInput('ip 13 pm 256GB 25000 TL\npil 85');
  assert.equal(title, 'ip 13 pm 256GB 25000 TL');
  assert.equal(listing.matchedDevice.id, 'apple-iphone-13-pro-max');
  assert.match(listing.product.name, /iPhone 13 Pro Max/);
  assert.equal(listing.detectedBattery, 85);
  assert.equal(listing.price, 25000);
  assert.equal(metadata, undefined);
});

test('URL metadata is combined with the catalog parser and decimal OG prices', async () => {
  const { parseListingInput } = createLoader({ fetch: async (url, options) => {
    assert.equal(url, 'https://api.secondcheck.example/api/parse-listing');
    assert.equal(options.method, 'POST');
    assert.equal(JSON.parse(options.body).url, 'https://letgo.com/item/test');
    return Response.json(metadata);
  } })(inputPath);
  const result = await parseListingInput('https://letgo.com/item/test', 'https://api.secondcheck.example/api/parse-listing');
  assert.equal(result.listing.matchedDevice.id, 'apple-iphone-13-pro-max');
  assert.equal(result.listing.detectedStorage, '256GB');
  assert.equal(result.listing.detectedBattery, 85);
  assert.equal(result.listing.detectedPrice, 25000);
  assert.equal(result.listing.price, 25000);
  assert.equal(result.listing.priceComparison.status, 'FIRSAT');
  assert.equal(result.listing.flags.hasChanges, true);
  assert.equal(result.metadata.title, metadata.title);
  assert.ok(!result.listing.notes.some((note) => note.startsWith('Fiyat bulunamadı')));
});

test('OG prices support Turkish grouping and override stale description prices', async () => {
  const { parseListingInput } = createLoader({ fetch: async () => Response.json({
    ...metadata, rawPrice: '28.500,50', description: 'Eski fiyat: 30000 TL',
  }) })(inputPath);
  const { listing } = await parseListingInput('https://letgo.com/item/test');
  assert.equal(listing.detectedPrice, 28500.5);
  assert.equal(listing.price, 28500.5);
  assert.ok(Math.abs(listing.priceComparison.differencePercentage - ((28500.5 - 35000) / 35000) * 100) < 0.000001);
});

test('absent or invalid metadata prices retain prices parsed from text', async () => {
  for (const rawPrice of [null, '-100', 'unknown']) {
    const { parseListingInput } = createLoader({ fetch: async () => Response.json({
      ...metadata, rawPrice, description: 'Fiyat: 28000 TL',
    }) })(inputPath);
    assert.equal((await parseListingInput('https://letgo.com/item/test')).listing.detectedPrice, 28000);
  }
});

test('API failures, invalid responses and network failures produce useful fallback errors', async () => {
  for (const fetch of [
    async () => Response.json({ success: false, error: 'İlan metnini yapıştırarak devam edin.' }, { status: 502 }),
    async () => new Response('<html>not an API</html>'),
    async () => Response.json({ success: true, title: 123 }),
    async () => { throw new TypeError('failed to fetch'); },
  ]) {
    const { parseListingInput } = createLoader({ fetch })(inputPath);
    await assert.rejects(() => parseListingInput('https://letgo.com/item/test'), /metnini yapıştır/);
  }
});

test('client timeout is graceful and unsupported URL schemes stay off the network', async () => {
  const { parseListingInput } = createLoader({
    setTimeout: (callback) => { queueMicrotask(callback); return 0; },
    clearTimeout: () => {},
    fetch: async (_, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    }),
  })(inputPath);
  await assert.rejects(() => parseListingInput('https://letgo.com/item/test'), /metnini yapıştır/);
  const offline = createLoader({ fetch: () => assert.fail('must not fetch') })(inputPath);
  await assert.rejects(() => offline.parseListingInput('file:///etc/passwd'), /HTTP\/HTTPS/);
});

test('caller cancellation aborts an in-flight metadata request', async () => {
  let upstreamAborted = false;
  const { parseListingInput } = createLoader({
    fetch: async (_, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => {
        upstreamAborted = true;
        reject(new Error('cancelled'));
      }, { once: true });
    }),
  })(inputPath);
  const controller = new AbortController();
  const pending = parseListingInput('https://letgo.com/item/test', undefined, controller.signal);
  controller.abort();
  await assert.rejects(() => pending, /metnini yapıştır/);
  assert.equal(upstreamAborted, true);
});
