/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const catalog = require('../data/devicesCatalog.json');

const helperPath = path.resolve(__dirname, '../utils/catalogHelper.ts');
const source = ts.transpileModule(fs.readFileSync(helperPath, 'utf8'), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  },
}).outputText;
const loadedModule = { exports: {} };
vm.runInNewContext(source, {
  module: loadedModule,
  exports: loadedModule.exports,
  require: (name) => {
    assert.equal(name, '../data/devicesCatalog.json');
    return catalog;
  },
});
const { getAllDevices, getDeviceById, searchDevices, filterByBrand } =
  loadedModule.exports;
const ids = (devices) => Array.from(devices, (device) => device.id);
const conceptId = 'apple-iphone-18-pro-max';

test('every catalog row has the exact schema, unique identity and valid values', () => {
  const seen = new Set();
  const strings = (values, allowEmpty = false) => {
    assert.ok(Array.isArray(values));
    assert.ok(allowEmpty || values.length > 0);
    assert.equal(new Set(values).size, values.length);
    assert.ok(values.every((value) => typeof value === 'string' && value.trim()));
  };
  for (const device of catalog) {
    assert.deepEqual(Object.keys(device).sort(), [
      'brand', 'chronicIssues', 'criticalChecks', 'estimatedPriceBand',
      'id', 'model', 'releaseYear', 'variants',
    ]);
    assert.match(device.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(!seen.has(device.id), device.id);
    seen.add(device.id);
    assert.ok(['Apple', 'Samsung', 'Xiaomi', 'Redmi'].includes(device.brand));
    assert.ok(typeof device.model === 'string' && device.model.trim());
    const concept = device.id === conceptId;
    assert.ok(Number.isInteger(device.releaseYear));
    assert.ok(concept ? device.releaseYear === 0 : device.releaseYear >= 2014 && device.releaseYear <= 2026);
    assert.deepEqual(Object.keys(device.variants).sort(), ['colors', 'storage']);
    strings(device.variants.storage, concept);
    strings(device.variants.colors, concept);
    assert.ok(device.variants.storage.every((value) => /^\d+(GB|TB)$/.test(value)));
    strings(device.chronicIssues);
    strings(device.criticalChecks);
    const band = device.estimatedPriceBand;
    assert.deepEqual(Object.keys(band).sort(), ['avgTry', 'maxTry', 'minTry']);
    assert.ok(Object.values(band).every((value) => Number.isSafeInteger(value) && (concept ? value === 0 : value > 0)));
    assert.ok(band.minTry <= band.avgTry && band.avgTry <= band.maxTry);
  }
});

test('requested Apple generations and legitimate Samsung FE/foldable models exist', () => {
  const expected = [
    '6', '6-plus', '6s', '6s-plus', '7', '7-plus', '8', '8-plus',
    'se-1', 'se-2', 'se-3', 'x', 'xr', 'xs', 'xs-max',
    '11', '11-pro', '11-pro-max',
    ...[12, 13].flatMap((n) => [String(n), `${n}-mini`, `${n}-pro`, `${n}-pro-max`]),
    ...[14, 15, 16].flatMap((n) => [String(n), `${n}-plus`, `${n}-pro`, `${n}-pro-max`]),
    '17', '17-pro', '17-pro-max', '18-pro-max',
  ].map((suffix) => `apple-iphone-${suffix}`);
  for (const n of [20, 21, 22, 23, 24]) {
    for (const suffix of ['', '-plus', '-ultra']) expected.push(`samsung-galaxy-s${n}${suffix}`);
  }
  for (const n of [20, 21, 23, 24]) expected.push(`samsung-galaxy-s${n}-fe`);
  for (const n of [3, 4, 5, 6]) {
    expected.push(`samsung-galaxy-z-flip${n}`, `samsung-galaxy-z-fold${n}`);
  }
  for (const suffix of ['a52', 'a53-5g', 'a54-5g', 'a55-5g']) expected.push(`samsung-galaxy-${suffix}`);
  for (const id of expected) assert.ok(getDeviceById(id), id);
  assert.equal(getDeviceById('samsung-galaxy-s22-fe'), undefined);
  assert.equal(getDeviceById('apple-iphone-17-plus'), undefined);
});

test('Redmi generations retain separate 4G/5G identities and Xiaomi families exist', () => {
  for (const n of [10, 11, 12, 13]) {
    assert.ok(getDeviceById(`redmi-note-${n}`));
    assert.ok(getDeviceById(`redmi-note-${n}-pro`));
  }
  for (const n of [11, 12, 13]) assert.ok(getDeviceById(`redmi-note-${n}-pro-plus-5g`));
  assert.equal(getDeviceById('redmi-note-10-pro-plus'), undefined);
  for (const n of [12, 13]) {
    assert.notEqual(getDeviceById(`redmi-note-${n}-pro`).id, getDeviceById(`redmi-note-${n}-pro-5g`).id);
  }
  for (const n of [12, 13, 14]) {
    assert.ok(getDeviceById(`xiaomi-${n}`));
    assert.ok(getDeviceById(`xiaomi-${n}-pro`));
  }
});

test('search tolerates Turkish casing, whitespace, token order and compact names', () => {
  const expected = 'apple-iphone-13-pro-max';
  for (const query of [' APPLE   İPHONE 13 PRO MAX ', 'apple ıphone13 pro max', 'max pro 13 apple', 'iPhone13ProMax']) {
    assert.ok(ids(searchDevices(query)).includes(expected), query);
  }
  assert.ok(ids(searchDevices('galaxy S24+')).includes('samsung-galaxy-s24-plus'));
  assert.ok(ids(searchDevices('redmi note 13 pro+')).includes('redmi-note-13-pro-plus-5g'));
  assert.equal(searchDevices('olmayan marka xyz').length, 0);
  assert.equal(searchDevices('!!!').length, 0);
  assert.deepEqual(ids(searchDevices('  \t ')), ids(getAllDevices()));
  // Match only brand/model; issue descriptions are not search terms.
  assert.equal(searchDevices('Lightning').length, 0);
});

test('brand filtering is normalized, exact and does not leak other brands', () => {
  for (const brand of ['Apple', 'Samsung', 'Xiaomi', 'Redmi']) {
    const found = filterByBrand(` ${brand.toUpperCase()} `);
    assert.ok(found.length > 0);
    assert.ok(found.every((device) => device.brand === brand));
    assert.equal(found.length, catalog.filter((device) => device.brand === brand).length);
  }
  assert.equal(filterByBrand('XİAOMİ').length, filterByBrand('Xiaomi').length);
  for (const brand of ['', '  ', 'sam', 'unknown']) assert.equal(filterByBrand(brand).length, 0);
});

test('exact ID lookup fails safely and all public result paths isolate nested mutations', () => {
  const id = 'apple-iphone-13-pro-max';
  const snapshot = JSON.stringify(getDeviceById(id));
  assert.equal(getDeviceById('APPLE-IPHONE-13-PRO-MAX'), undefined);
  assert.equal(getDeviceById(''), undefined);
  assert.equal(getDeviceById('__proto__'), undefined);
  for (const result of [
    getAllDevices().find((device) => device.id === id),
    getDeviceById(id),
    searchDevices('iphone 13 pro max').find((device) => device.id === id),
    filterByBrand('apple').find((device) => device.id === id),
  ]) {
    result.model = 'changed';
    result.variants.storage.push('999GB');
    result.variants.colors.length = 0;
    result.estimatedPriceBand.avgTry = -1;
    result.chronicIssues.length = 0;
    result.criticalChecks.push('changed');
    assert.equal(JSON.stringify(getDeviceById(id)), snapshot);
  }
  const all = getAllDevices();
  all.length = 0;
  assert.equal(getAllDevices().length, catalog.length);
});

test('critical checks respect major hardware differences and service program scope', () => {
  const checks = (id) => getDeviceById(id).criticalChecks.join(' ');
  assert.match(checks('apple-iphone-se-3'), /Touch ID/);
  assert.match(checks('apple-iphone-13-pro-max'), /Face ID/);
  assert.match(checks('apple-iphone-15'), /USB-C/);
  assert.match(checks('apple-iphone-14'), /Lightning/);
  assert.match(checks('redmi-note-10-5g'), /LCD/);
  assert.match(checks('samsung-galaxy-z-fold6'), /filmi sökmeyin/);
  assert.ok(getDeviceById('apple-iphone-12').chronicIssues.some((issue) => issue.startsWith('Apple servis programı')));
  assert.ok(!getDeviceById('apple-iphone-12-mini').chronicIssues.some((issue) => issue.startsWith('Apple servis programı')));
  const concept = getDeviceById(conceptId);
  assert.match(concept.model, /Konsept/);
  assert.equal(concept.releaseYear, 0);
  assert.equal(concept.estimatedPriceBand.avgTry, 0);
  assert.equal(concept.variants.storage.length, 0);
});
