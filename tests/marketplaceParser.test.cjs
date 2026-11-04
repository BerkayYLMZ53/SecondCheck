/* global __dirname */
const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const load = require('./helpers/loadTypeScript.cjs')({ fetch: () => assert.fail('marketplace parsing must never fetch') });
const { parseMarketplaceUrl, getMarketplacePlatform } = load(path.resolve(__dirname, '../utils/marketplaceParser.ts'));
const { parseListingInput } = load(path.resolve(__dirname, '../utils/listingInput.ts'));
const { getAllDevices } = load(path.resolve(__dirname, '../data/devices.ts'));

test('Sahibinden phone category and brandless model populate the valuation fields offline', async () => {
  const result = await parseListingInput('https://www.sahibinden.com/ilan/ikinci-el-ve-sifir-alisveris-cep-telefonu-aksesuar-cep-telefonu-tr-16-pro-max-256-gb-pil-91-12-ay-garantili-1348611203/detay');
  assert.equal(result.marketplace.status, 'matched');
  assert.equal(result.marketplace.canOpenValuation, true);
  assert.equal(result.listing.matchedDevice.brand, 'Apple');
  assert.equal(result.listing.matchedDevice.model, 'iPhone 16 Pro Max');
  assert.equal(result.listing.detectedStorage, '256GB');
  assert.equal(result.listing.detectedBattery, 91);
  assert.match(result.listing.product.name, /iPhone 16 Pro Max.*256GB/);
  assert.equal(result.listing.price, null);
  assert.equal(result.listing.detectedPrice, undefined);
});

test('brandless iPhone generations and supported suffixes retain their exact catalog identity', () => {
  for (const device of getAllDevices().filter((d) => d.brand === 'Apple' && /^iPhone 1[1-8] (?:Pro Max|Pro|Plus|Mini)\b/i.test(d.model))) {
    for (const prefix of ['tr', 'sifir', 'temiz']) {
      const slug = `${prefix}-${device.model.replace(/^iPhone /, '').replace(/ \(.*$/, '').replace(/\s+/g, '-')}-${device.variants.storage[0] ?? ''}-1234567890`;
      const result = parseMarketplaceUrl(`https://sahibinden.com/ilan/${slug}/detay`);
      assert.equal(result.listing.matchedDevice?.id, device.id, slug);
      assert.equal(result.canOpenValuation, device.releaseYear > 0, slug);
    }
  }
});

test('storage supports bare capacities, GB and TB without treating battery or warranty as storage', () => {
  for (const [capacity, storage] of [['128', '128GB'], ['256-gb', '256GB'], ['512', '512GB'], ['1024', '1TB'], ['1-tb', '1TB']]) {
    const result = parseMarketplaceUrl(`https://sahibinden.com/ilan/tr-13-pro-max-${capacity}-pil_64-12-ay-garantili-1234567890`);
    assert.equal(result.status, 'matched', capacity);
    assert.equal(result.listing.detectedStorage, storage);
    assert.equal(result.listing.detectedBattery, 64);
  }
  const noStorage = parseMarketplaceUrl('https://sahibinden.com/ilan/16-pro-max-pil-64-128-ay-garantili-1234567890');
  assert.equal(noStorage.listing.detectedStorage, undefined);
  for (const battery of ['pil-91', 'pil_91', 'pil:91', 'pil-sagligi-91', 'batarya-91']) {
    assert.equal(parseMarketplaceUrl(`https://sahibinden.com/ilan/16-pro-max-256gb-${battery}-1234567890`).listing.detectedBattery, 91, battery);
  }
  for (const model of ['16pro', '16promax', '16 pro max', '16_pro_max']) {
    assert.equal(parseMarketplaceUrl(`https://sahibinden.com/ilan/${encodeURIComponent(model)}-256gb-1234567890`).listing.matchedDevice?.model,
      model === '16pro' ? 'iPhone 16 Pro' : 'iPhone 16 Pro Max');
  }
});

test('brandless inference rejects competing brands, accessories, invalid suffixes and ambiguous capacities', () => {
  for (const slug of ['redmi-16-pro', 'xiaomi-13-pro', 'samsung-16-pro', '16', '16-max', '11-plus', '16-pro-max-kilifi', '16-pro-max-aksesuar', '16-pro-max-128-256', '16-pro-15-pro']) {
    assert.equal(parseMarketplaceUrl(`https://sahibinden.com/ilan/${slug}-1234567890`).canOpenValuation, false, slug);
  }
  for (const battery of ['pil-101', 'pil-999', 'pil-91-pil-85']) {
    const result = parseMarketplaceUrl(`https://sahibinden.com/ilan/16-pro-max-256gb-${battery}-1234567890`);
    assert.equal(result.listing.detectedBattery, undefined, battery);
  }
});

for (const [url, platform, id, storage] of [
  ['https://www.sahibinden.com/ilan/ikinci-el-temiz-garantili-kutusunda-faturali-acil-orijinal-ciziksiz-iphone-13-pro-max-128-gb-1234567890/detay', 'Sahibinden', 'apple-iphone-13-pro-max', '128GB'],
  ['https://sahibinden.com/ilan/temiz-samsung-galaxy-s23-ultra-256gb-1234567890', 'Sahibinden', 'samsung-galaxy-s23-ultra', '256GB'],
  ['https://dolap.com/urun/cep-telefonu-apple-az-kullanilmis-iphone-13-pro-max-128gb-1234567890', 'Dolap', 'apple-iphone-13-pro-max', '128GB'],
  ['www.dolap.com/urun/cep-telefonu-samsung-galaxy-s24-ultra-256-gb-1234567890', 'Dolap', 'samsung-galaxy-s24-ultra', '256GB'],
  ['https://dolap.com/urun/apple-max-temiz-13-pro-128gb-1234567890', 'Dolap', 'apple-iphone-13-pro-max', '128GB'],
  ['https://sahibinden.com/ilan/%C4%B0PHONE-16-PRO-256GB-1234567890/detay', 'Sahibinden', 'apple-iphone-16-pro', '256GB'],
  ['https://dolap.com/urun/apple-iphone-13-pro-max-1024-gb-1234567890', 'Dolap', 'apple-iphone-13-pro-max', '1TB'],
]) test(`platform model/storage: ${url}`, async () => {
  const result = await parseListingInput(url);
  assert.equal(result.marketplace.platform, platform);
  assert.equal(result.marketplace.status, 'matched');
  assert.equal(result.marketplace.canOpenValuation, true);
  assert.equal(result.listing.matchedDevice.id, id);
  assert.equal(result.listing.detectedStorage, storage);
  assert.ok(result.listing.product.name.includes(`(${storage}`));
  assert.equal(result.listing.price, null);
  assert.equal(result.listing.detectedPrice, undefined);
});

test('every Apple/Samsung model and storage in the real catalog passes each platform', () => {
  for (const device of getAllDevices().filter((d) => ['Apple', 'Samsung'].includes(d.brand) && d.releaseYear > 0)) {
    for (const storage of device.variants.storage) {
      for (const [host, route] of [['sahibinden.com', 'ilan'], ['dolap.com', 'urun']]) {
        const slug = `${device.model.replace(/\s+/g, '-')}-${storage}-1234567890`;
        const result = parseMarketplaceUrl(`https://${host}/${route}/${encodeURI(slug)}`);
        assert.equal(result.status, 'matched', `${host}: ${device.model} ${storage}`);
        assert.equal(result.listing.matchedDevice.id, device.id);
        assert.equal(result.listing.detectedStorage, storage);
        assert.ok(result.listing.product.name.includes(`(${storage}`));
      }
    }
  }
});

test('unclear, accessory and unsupported models fail locally instead of guessing or fetching', async () => {
  for (const slug of ['1234567890', 'temiz-kutulu-telefon-1234567890', 'iphone-13-ultra-1234567890', 's22-fe-1234567890', 'iphone-13-kilifi-1234567890', 'iphone-13-pro-iphone-13-pro-max-1234567890', 'iphone-13-ve-iphone-14-1234567890', 'samsung-iphone-13-1234567890', 'iphone-13-pro-max-128gb-256gb-1234567890']) {
    const result = await parseListingInput(`https://dolap.com/urun/${slug}`);
    assert.equal(result.marketplace.canOpenValuation, false, slug);
    assert.equal(result.listing.product, null, slug);
  }
});

test('wrong routes, malformed escapes, credentials and nonstandard ports cannot match', async () => {
  for (const url of [
    'https://sahibinden.com/iphone-13-pro-max-128gb',
    'https://dolap.com/urun/',
    'https://dolap.com/urun/%ZZ-iphone-13',
    'https://u:p@dolap.com/urun/iphone-13',
    'https://sahibinden.com:8080/ilan/iphone-13',
  ]) {
    const result = await parseListingInput(url);
    assert.equal(result.marketplace.status, 'invalid', url);
    assert.equal(result.marketplace.canOpenValuation, false);
  }
  assert.equal(getMarketplacePlatform('https://dolap.com.evil.example/urun/iphone-13'), null);
  assert.equal(getMarketplacePlatform('https://evil.example/?url=https://dolap.com/urun/iphone-13'), null);
});

test('tracking, nested paths and slug numbers cannot supply missing model or price', async () => {
  const result = await parseListingInput('https://sahibinden.com/ilan/1234567890/detay?model=iphone-13-pro-max&storage=128gb#iphone-14');
  assert.equal(result.marketplace.canOpenValuation, false);
  assert.equal(result.listing.detectedStorage, undefined);
  assert.equal(result.listing.price, null);
  assert.equal(parseMarketplaceUrl('https://dolap.com/urun/1234567890/iphone-13-pro-max').status, 'invalid');
});

test('unsupported storage and concept are recognized but never activate valuation', async () => {
  const storage = await parseListingInput('https://dolap.com/urun/iphone-13-pro-max-64gb-1234567890');
  assert.equal(storage.marketplace.status, 'unsupported-variant');
  assert.equal(storage.listing.matchedDevice.id, 'apple-iphone-13-pro-max');
  assert.equal(storage.listing.detectedStorage, '64GB');
  assert.equal(storage.listing.product, null);
  const concept = await parseListingInput('https://sahibinden.com/ilan/iphone-18-pro-max-1234567890');
  assert.equal(concept.marketplace.status, 'concept');
  assert.equal(concept.marketplace.canOpenValuation, false);
  assert.equal(concept.listing.product, null);
});
