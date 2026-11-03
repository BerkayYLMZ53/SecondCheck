/* global __dirname */
const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const createLoader = require('./helpers/loadTypeScript.cjs');
const load = createLoader();
const { parseDeviceListing, parseListing } = load(path.resolve(__dirname, '../utils/listingParser.ts'));
const catalog = require('../data/devicesCatalog.json');

for (const [input, id] of [
  ['ip 13 pm', 'apple-iphone-13-pro-max'],
  ['iphone 13 pro max', 'apple-iphone-13-pro-max'],
  ['İPHONE13PROMAX 256 GB', 'apple-iphone-13-pro-max'],
  ['iphone 13 p', 'apple-iphone-13-pro'],
  ['s24u', 'samsung-galaxy-s24-ultra'],
  ['Samsung Galaxy S24 Ultra', 'samsung-galaxy-s24-ultra'],
  ['galaxy s23+', 'samsung-galaxy-s23-plus'],
  ['redmi note 12 pro', 'redmi-note-12-pro'],
  ['redmi note 12 pro 5g', 'redmi-note-12-pro-5g'],
  ['redmi note 13 pro+', 'redmi-note-13-pro-plus-5g'],
  ['Samsung A55', 'samsung-galaxy-a55-5g'],
  ['Galaxy Z Flip 6', 'samsung-galaxy-z-flip6'],
  ['fold4', 'samsung-galaxy-z-fold4'],
  ['iphone se 2', 'apple-iphone-se-2'],
  ['iPhone SE (3rd generation)', 'apple-iphone-se-3'],
  ['xiomi 13 pro', 'xiaomi-13-pro'],
  ['xiaomi 14t pro', 'xiaomi-14t-pro'],
]) {
  test(`catalog alias: ${input}`, () => {
    assert.equal(parseDeviceListing(input).matchedDevice?.id, id);
    assert.equal(parseListing(input).matchedDevice?.id, id);
  });
}

test('all full device catalog model names resolve to their stable IDs', () => {
  for (const device of catalog) {
    assert.equal(parseDeviceListing(`${device.model} fiyat 25.000 TL`).matchedDevice?.id, device.id, device.model);
  }
});

test('brand-only, competing, unsupported and URL inputs never invent a match', () => {
  for (const input of [
    '', 'Apple', 'Samsung', '25000', 'iphone 99', 'iphone 13 ultra',
    's22 fe', 'redmi note 10 pro+', 'iPhone 13 veya iPhone 14',
    'https://www.sahibinden.com/ilan/iphone-13-pro-max-123456789',
  ]) assert.equal(parseDeviceListing(input).matchedDevice, null, input);
});

test('storage is normalized and does not consume price, RAM or battery values', () => {
  for (const [input, capacity] of [
    ['iphone 13 64', '64GB'], ['iphone 13 128', '128GB'],
    ['iphone 13 256 gb', '256GB'], ['iphone 13 512GB', '512GB'],
    ['iphone 13 pro max 1tb', '1TB'], ['iphone 13 pro max 1 tb', '1TB'],
    ['iphone 13 pro max 1024GB', '1TB'], ['iphone 17 pro max 2tb', '2TB'],
  ]) assert.equal(parseDeviceListing(input).detectedStorage, capacity, input);
  for (const input of ['iphone 13 %64', 'iphone 13 pil 64', 'iphone 13 8GB RAM', 'iphone 13 64.000', 'iphone 13 128 TL', 'iphone 13 128/256GB']) {
    assert.equal(parseDeviceListing(input).detectedStorage, undefined, input);
  }
});

test('prices support TRY formats, plain numbers and Turkish cents', () => {
  for (const [input, amount] of [
    ['25.000 TL', 25000], ['25000', 25000], ['28.500₺', 28500],
    ['₺28.500', 28500], ['28 500 TL', 28500], ['28.500,50 TL', 28500.5],
  ]) assert.equal(parseDeviceListing(`ip 13 pm 256GB ${input}`).detectedPrice, amount, input);
  assert.equal(parseDeviceListing('iphone 13 256 pil 100').detectedPrice, undefined);
  assert.equal(parseDeviceListing('iphone 13 25000 TL veya 28000 TL').detectedPrice, undefined);
  assert.equal(parseDeviceListing('iphone 13 pil masrafı 800 TL. Fiyat: 25000 TL').detectedPrice, 25000);
});

test('battery percentage supports labels and either percent position', () => {
  for (const [input, expected] of [['%85', 85], ['pil 88', 88], ['pil sağlığı 92', 92], ['pil sağlığı %100', 100], ['85%', 85], ['pil 0', 0]]) {
    assert.equal(parseDeviceListing(`iphone 13 ${input}`).detectedBattery, expected, input);
  }
  for (const input of ['pil 150', 'pil 800 TL', 'indirim %15', 'pil 85 pil 88']) {
    assert.equal(parseDeviceListing(`iphone 13 ${input}`).detectedBattery, undefined, input);
  }
});

test('flags distinguish presence, absence, expired warranty and negated repairs', () => {
  const positive = parseDeviceListing('iphone 13 kutulu faturalı garantili ekran değişti pil değişti tamir gördü').flags;
  assert.equal(positive.hasBox, true);
  assert.equal(positive.hasInvoice, true);
  assert.equal(positive.hasWarranty, true);
  assert.equal(positive.hasChanges, true);
  assert.equal(positive.changeNotes.length, 3);
  for (const input of [
    'kutusuz faturasız garantisiz değişensiz',
    'kutu yok fatura yok garanti bitti değişen yok',
    'kutusu yoktur faturası bulunmuyor garanti süresi dolmuş ekran değişmedi tamir görmedi',
    'kutu ve fatura yok garantisi yok değişen parça yok',
  ]) {
    const flags = parseDeviceListing(input).flags;
    assert.equal(flags.hasBox, false, input);
    assert.equal(flags.hasInvoice, false, input);
    assert.equal(flags.hasWarranty, false, input);
    assert.equal(flags.hasChanges, false, input);
  }
  assert.equal(parseDeviceListing('değişen yok ama pil değişti').flags.hasChanges, true);
});

test('comparison uses signed percentages and inclusive 15 percent boundaries', () => {
  const average = catalog.find((device) => device.id === 'apple-iphone-13').estimatedPriceBand.avgTry;
  for (const [factor, status] of [[0.84, 'FIRSAT'], [0.85, 'FIRSAT'], [1, 'NORMAL'], [1.15, 'PAHALI'], [1.16, 'PAHALI']]) {
    const price = Math.round(average * factor * 100) / 100;
    const result = parseDeviceListing(`iphone 13 fiyat: ${price} TL`);
    assert.equal(result.priceComparison?.status, status);
    assert.ok(Math.abs(result.priceComparison.differencePercentage - (factor - 1) * 100) < 0.00001);
  }
  assert.equal(parseDeviceListing('iphone 18 pro max fiyat: 120000 TL').priceComparison, undefined);
  assert.equal(parseDeviceListing('iphone 13').priceComparison, undefined);
  assert.equal(parseDeviceListing('fiyat: 25000 TL').priceComparison, undefined);
});
