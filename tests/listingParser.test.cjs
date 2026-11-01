/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

// Exercise the real TypeScript parser and generated catalog without a second runner.
const cache = new Map();
function loadTypeScript(file) {
  if (cache.has(file)) return cache.get(file);
  const module = { exports: {} };
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  vm.runInNewContext(
    compiled,
    {
      module,
      exports: module.exports,
      require: (name) =>
        loadTypeScript(path.resolve(path.dirname(file), `${name}.ts`)),
    },
    { filename: file },
  );
  cache.set(file, module.exports);
  return module.exports;
}
const { parseListing } = loadTypeScript(
  path.resolve(__dirname, '../utils/listingParser.ts'),
);
const { PRODUCTS_DATABASE } = loadTypeScript(
  path.resolve(__dirname, '../data/mockProducts.ts'),
);

for (const amount of [
  '14.500 TL',
  '14500',
  '14.500₺',
  '₺14.500',
  '14 500 TL',
  '14\u00a0500 TL',
]) {
  test(`extract price: ${amount}`, () => {
    assert.equal(parseListing(`RTX 3070 Ti ${amount}`).price, 14500);
  });
}
const models = [
  ['3070 ti 14500 TL', /RTX 3070 Ti/],
  ['MSI RTX 3060 12GB 9200 TL', /^MSI .*RTX 3060 \(12GB/],
  ['RTX 3060 Ti 10500 TL', /RTX 3060 Ti/],
  ['5600', /Ryzen 5 5600 \(/],
  ['Ryzen 5600X 4200 TL', /Ryzen 5 5600X/],
  ['RX 5600 XT 4400 TL', /RX 5600 XT/],
  ['iphone 13 256GB 34500 TL', /iPhone 13 \(256GB/],
  ['iPhone 13 Pro Max 512GB', /iPhone 13 Pro Max \(512GB/],
  ['m1 air 8gb 256gb 22000', /MacBook Air M1 \(8GB RAM \/ 256GB/],
  ['Samsung S23 Ultra 256GB', /Galaxy S23 Ultra/],
  ['Samsung Galaxy S23+ 256GB', /Galaxy S23\+/],
  ['Xiaomi 13T 256GB', /Xiaomi 13T/],
  ['Nintendo Switch OLED', /Switch OLED/],
  ['MSI B550M PRO-VDH WIFI', /MSI B550M/],
  ['Acer Predator Helios 300 RTX 3060', /Acer Predator Helios 300/],
  ['PS5 23500 TL', /PlayStation 5/],
  ['Legion Go 25000 TL', /Legion Go/],
];
for (const [input, expected] of models) {
  test(`match model: ${input}`, () =>
    assert.match(parseListing(input).product?.name ?? '', expected));
}
test('plain price and generic brands never select an arbitrary device', () => {
  for (const text of [
    '14500',
    'Fiyat: 5600 TL',
    'Apple temiz cihaz',
    'satılık 14.500 TL',
    'iPhone 99',
  ]) {
    assert.equal(parseListing(text).product, null, text);
  }
});
test('SKU, capacity, year and battery percentage are not asking prices', () => {
  for (const text of [
    'Ryzen 5600',
    'iPhone 13 128GB pil 79',
    'MacBook Air M1 8 GB 256 GB 2020',
  ]) {
    assert.equal(parseListing(text).price, null, text);
  }
});
test('Turkish cents are preserved', () =>
  assert.equal(parseListing('RTX 3070 Ti 14.500,50 TL').price, 14500.5));
test('labeled price takes precedence over maintenance costs', () => {
  assert.equal(
    parseListing('iPhone 13 pil masrafı 800 TL. Fiyat: 34500 TL').price,
    34500,
  );
});
test('multiple distinct asking prices require manual entry', () => {
  const result = parseListing('iPhone 13 38.000 TL / 34.500 TL');
  assert.equal(result.price, null);
  assert.ok(result.notes.some((note) => note.includes('Birden fazla fiyat')));
});
test('scratches override missing packaging; all findings remain visible', () => {
  const result = parseListing(
    'iPhone 13 çizik var kutu yok fatura var pil 79 ekran değişmiş 34500 TL',
  );
  assert.equal(result.condition, 'cosmetic');
  for (const kind of [
    'cosmetic',
    'missing-box',
    'invoice',
    'battery',
    'replacement',
  ]) {
    assert.ok(
      result.findings.some((finding) => finding.kind === kind),
      kind,
    );
  }
});
test('missing box or invoice chooses device-only condition', () => {
  assert.equal(parseListing('RTX 3070 Ti kutu yok').condition, 'device');
  assert.equal(parseListing('iPhone 13 faturasız').condition, 'device');
});
test('negated defects do not lower the condition', () => {
  const result = parseListing(
    'iPhone 13 çizik yok değişen yok kutulu faturalı',
  );
  assert.equal(result.condition, 'boxed');
  assert.equal(
    result.findings.some((finding) => finding.warning),
    false,
  );
});
test('one negated defect does not hide a separate positive defect', () => {
  assert.equal(
    parseListing('iPhone 13 çizik yok, ekran çatlak').condition,
    'cosmetic',
  );
});
test('battery or replacement alerts do not invent a cosmetic adjustment', () => {
  const result = parseListing('iPhone 13 pil 79 ekran değişmiş');
  assert.equal(result.condition, 'boxed');
  assert.ok(
    result.findings.some(
      (finding) => finding.kind === 'battery' && finding.warning,
    ),
  );
  assert.ok(result.notes.some((note) => note.includes('otomatik eklenmez')));
});
test('empty and oversized inputs remain safe', () => {
  assert.equal(parseListing('').product, null);
  assert.equal(parseListing('').price, null);
  assert.match(
    parseListing(`iPhone 13 34500 TL ${'temiz '.repeat(10000)}`).product.name,
    /iPhone 13/,
  );
});
test('every complete catalog title resolves to its original variant', () => {
  for (const product of PRODUCTS_DATABASE) {
    const result = parseListing(`${product.name} fiyat: 14.500 TL`);
    assert.equal(result.product?.id, product.id, product.name);
    assert.equal(result.price, 14500, product.name);
  }
});
