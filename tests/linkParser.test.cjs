/* global __dirname */
const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const createLoader = require('./helpers/loadTypeScript.cjs');
const load = createLoader();
const parserPath = path.resolve(__dirname, '../utils/listingInput.ts');
const { parseProductUrl, readProductUrl, isLinkInput } = load(path.resolve(__dirname, '../utils/linkParser.ts'));
const { parseListingInput } = createLoader({ fetch: () => assert.fail('slug matching must stay offline') })(parserPath);

for (const [url, id, storage] of [
  ['https://www.sahibinden.com/ilan/iphone-13-pro-max-128gb-123456789/detay', 'apple-iphone-13-pro-max', '128GB'],
  ['https://www.letgo.com/item/iphone-14-pro-128-gb-123456789', 'apple-iphone-14-pro', '128GB'],
  ['https://www.trendyol.com/samsung/galaxy-s24-ultra-256-gb-p-123456789', 'samsung-galaxy-s24-ultra', '256GB'],
  ['https://www.hepsiburada.com/samsung-galaxy-s24-ultra-p-HBCV000012345', 'samsung-galaxy-s24-ultra', undefined],
  ['https://www.apple.com/tr/shop/buy-iphone/iphone-16-pro/256gb', 'apple-iphone-16-pro', '256GB'],
  ['www.easycep.com/apple-iphone-6-64-gb', 'apple-iphone-6', '64GB'],
  ['https://example.com/Apple%20%C4%B0PHONE%2013%20PRO%20MAX%20512GB', 'apple-iphone-13-pro-max', '512GB'],
]) test(`offline slug: ${url}`, async () => {
  const result = await parseListingInput(url);
  assert.equal(result.source, 'slug');
  assert.equal(result.listing.matchedDevice.id, id);
  assert.equal(result.listing.detectedStorage, storage);
  assert.ok(result.listing.product);
  if (storage) assert.ok(result.listing.product.name.includes(`(${storage}`));
  assert.equal(result.listing.price, null);
  assert.equal(result.listing.detectedPrice, undefined);
  assert.equal(result.listing.priceComparison, undefined);
});

test('query/hash model names and listing IDs never become device/price evidence', () => {
  const parsed = parseProductUrl('https://letgo.com/iphone-14-pro-128gb-123456789?model=iphone-13&price=25000#iphone-12');
  assert.equal(parsed.listing.matchedDevice.id, 'apple-iphone-14-pro');
  assert.equal(parsed.listing.price, null);
  assert.ok(!parsed.text.includes('123456789'));
  assert.equal(parseProductUrl('https://trendyol.com/p/123456789?search=iphone-13').listing.matchedDevice, null);
});

test('accessories, competing models and invalid suffixes never select a phone', () => {
  for (const slug of ['iphone-13-kilifi', 'iphone-13-pro-max-case', 'samsung-s24-ultra-ekran-koruyucu', 'iphone-13-ve-iphone-14', 'iphone-13-ultra']) {
    const result = parseProductUrl(`https://trendyol.com/${slug}`).listing;
    assert.equal(result.matchedDevice, null, slug);
    assert.equal(result.product, null, slug);
  }
});

test('unsupported capacity and concept model retain detection without selecting another SKU', async () => {
  const invalid = await parseListingInput('https://letgo.com/iphone-13-pro-max-64gb');
  assert.equal(invalid.listing.matchedDevice.id, 'apple-iphone-13-pro-max');
  assert.equal(invalid.listing.detectedStorage, '64GB');
  assert.equal(invalid.listing.product, null);
  const concept = await parseListingInput('https://example.com/iphone-18-pro-max');
  assert.equal(concept.listing.matchedDevice.id, 'apple-iphone-18-pro-max');
  assert.equal(concept.listing.product, null);
});

test('malformed schemes, credential URLs and oversized URLs fail without fetching', () => {
  for (const url of ['javascript:alert(1)', 'file:///etc/passwd', 'https://user:pass@letgo.com/x', 'http://[broken', 'https://letgo.com:8080/x', `https://letgo.com/${'x'.repeat(2050)}`]) {
    assert.throws(() => readProductUrl(url), /HTTP\/HTTPS/);
  }
  assert.equal(isLinkInput('iphone 13 https://letgo.com/item/1'), false);
});

test('opaque URLs use metadata and title wins over unrelated description models', async () => {
  const { parseListingInput } = createLoader({ fetch: async () => Response.json({
    success: true, title: 'Samsung Galaxy S24 Ultra 256GB',
    description: 'iPhone 13 ile karşılaştırın. Fiyat 42.000 TL', image: null, rawPrice: '42000.00',
  }) })(parserPath);
  const result = await parseListingInput('https://www.hepsiburada.com/p/HBCV123456');
  assert.equal(result.source, 'metadata');
  assert.equal(result.listing.matchedDevice.id, 'samsung-galaxy-s24-ultra');
  assert.match(result.listing.product.name, /Galaxy S24 Ultra \(256GB/);
  assert.equal(result.listing.price, 42000);
});

test('capacity from description is reconciled with the title model', async () => {
  const { parseListingInput } = createLoader({ fetch: async () => Response.json({
    success: true, title: 'Apple iPhone 14 Pro', description: '256GB kutulu', image: null, rawPrice: null,
  }) })(parserPath);
  const { listing } = await parseListingInput('https://easycep.com/urun/123456');
  assert.equal(listing.detectedStorage, '256GB');
  assert.match(listing.product.name, /iPhone 14 Pro \(256GB/);
});

test('new commerce hosts, short-link redirects and description-only HTML work through real API handler', async () => {
  const apiPath = path.resolve(__dirname, '../api/parse-listing.ts');
  for (const host of ['trendyol.com', 'hepsiburada.com', 'apple.com', 'easycep.com', 'samsung.com', 'ty.gl']) {
    let calls = 0;
    const api = createLoader({ fetch: async (url) => {
      calls++;
      if (new URL(url).hostname === 'ty.gl') return new Response(null, { status: 302, headers: { location: 'https://www.trendyol.com/p/123456' } });
      return new Response('<meta name="description" content="iPhone 14 Pro 128GB">', { headers: { 'content-type': 'text/html' } });
    } })(apiPath).default;
    const response = await api.fetch(new Request('https://secondcheck.example/api/parse-listing', {
      method: 'POST', body: JSON.stringify({ url: `https://${host}/p/123456` }),
    }));
    assert.equal(response.status, 200, host);
    assert.equal((await response.json()).title, 'iPhone 14 Pro 128GB');
    assert.equal(calls, host === 'ty.gl' ? 2 : 1);
  }
});

test('unmatched metadata returns a safe empty match and pre-cancelled URLs do not fetch', async () => {
  const { parseListingInput: opaque } = createLoader({ fetch: async () => Response.json({
    success: true, title: 'Satılık cihaz', description: '', image: null, rawPrice: null,
  }) })(parserPath);
  assert.equal((await opaque('https://easycep.com/p/123456')).listing.matchedDevice, null);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(() => parseListingInput('https://letgo.com/iphone-13', undefined, controller.signal), /iptal/);
});
