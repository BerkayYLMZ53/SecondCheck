/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  vm.runInNewContext(source, {
    module,
    exports: module.exports,
    require: (name) => load(path.resolve(path.dirname(file), `${name}.ts`)),
  });
  cache.set(file, module.exports);
  return module.exports;
}
const { PRODUCTS_DATABASE } = load(
  path.resolve(__dirname, '../data/mockProducts.ts'),
);
const {
  createSavedListing,
  decodeSavedListings,
  savedPriceDetails,
  savedValuationCondition,
} = load(path.resolve(__dirname, '../utils/savedListings.ts'));
const product = PRODUCTS_DATABASE.find((item) => item.category === 'gpu');
const input = {
  productId: product.id,
  title: 'Kadıköy elden teslim',
  askedPrice: 2500,
  condition: 'clean',
  valuationCondition: 'device',
};
const date = new Date('2026-11-01T10:00:00Z');
const sample = createSavedListing(input, [], date);

test('timestamp IDs remain unique for rapid saves in the same millisecond', () => {
  const items = [];
  for (let i = 0; i < 100; i++)
    items.push(createSavedListing(input, items, date));
  assert.equal(new Set(items.map((item) => item.id)).size, 100);
  assert.ok(
    items.every((item) => item.id.startsWith(`listing-${date.getTime()}`)),
  );
});
test('all required fields and exact packaging condition survive a JSON round trip', () => {
  const restored = decodeSavedListings(JSON.stringify([sample]));
  assert.deepEqual(JSON.parse(JSON.stringify(restored.items[0])), JSON.parse(JSON.stringify(sample)));
  assert.equal(restored.skipped, 0);
});
test('missing storage is an empty list', () => {
  assert.equal(decodeSavedListings(null).items.length, 0);
});
test('corrupt storage and non-array documents fail safely', () => {
  for (const raw of ['{bad json', '{}', 'null', '123', '"text"'])
    assert.throws(() => decodeSavedListings(raw));
});
test('validation keeps valid rows and rejects orphan models, duplicates and malformed fields', () => {
  const bad = [
    null,
    {},
    { ...sample, productId: 'missing' },
    { ...sample, askedPrice: -1 },
    { ...sample, askedPrice: '2500' },
    { ...sample, date: 'bad date' },
    { ...sample, condition: {} },
    { ...sample, valuationCondition: 'invalid' },
    { ...sample, title: ' ' },
    { ...sample, id: '' },
    sample,
  ];
  const decoded = decodeSavedListings(JSON.stringify([sample, ...bad]));
  assert.equal(decoded.items.length, 1);
  assert.equal(decoded.skipped, bad.length);
});
test('new entries reject invalid prices, models and conditions', () => {
  for (const askedPrice of [0, -1, NaN, Infinity, Number.MAX_SAFE_INTEGER])
    assert.throws(() => createSavedListing({ ...input, askedPrice }, []));
  assert.throws(() =>
    createSavedListing({ ...input, productId: 'not-in-catalog' }, []),
  );
  assert.throws(() =>
    createSavedListing({ ...input, condition: 'unknown' }, []),
  );
});
test('notes are trimmed and capped before persisting', () => {
  assert.equal(
    createSavedListing({ ...input, title: '  Elden teslim  ' }, []).title,
    'Elden teslim',
  );
  assert.equal(
    createSavedListing({ ...input, title: 'x'.repeat(1000) }, []).title.length,
    300,
  );
});
test('device-only listings retain the original five-percent baseline', () => {
  const detail = savedPriceDetails(sample, product);
  assert.equal(
    detail.fairPrice,
    Math.round(product.fairPrice * 0.95 * 100) / 100,
  );
  assert.equal(
    detail.difference,
    Math.round((input.askedPrice - detail.fairPrice) * 100) / 100,
  );
  assert.equal(savedValuationCondition(sample), 'device');
});
test('minor defects restore the twelve-percent baseline without extra metadata', () => {
  const item = {
    ...sample,
    condition: 'minor_defects',
    valuationCondition: undefined,
  };
  assert.equal(savedValuationCondition(item), 'cosmetic');
  assert.equal(
    savedPriceDetails(item, product).fairPrice,
    Math.round(product.fairPrice * 0.88 * 100) / 100,
  );
});
test('faulty listings use an explicit unadjusted reference instead of an invented repair discount', () => {
  const detail = savedPriceDetails({ ...sample, condition: 'faulty' }, product);
  assert.equal(detail.fairPrice, product.fairPrice);
  assert.match(detail.conditionLabel, /Arızalı/);
});
test('bargains, expensive listings and exact fair value retain signed deltas', () => {
  const clean = { ...sample, valuationCondition: 'boxed' };
  assert.equal(
    savedPriceDetails(
      { ...clean, askedPrice: product.fairPrice - 1500 },
      product,
    ).difference,
    -1500,
  );
  assert.equal(
    savedPriceDetails(
      { ...clean, askedPrice: product.fairPrice + 2000 },
      product,
    ).difference,
    2000,
  );
  assert.equal(
    savedPriceDetails({ ...clean, askedPrice: product.fairPrice }, product)
      .difference,
    0,
  );
});
