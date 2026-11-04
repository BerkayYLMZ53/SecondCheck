/* global __dirname */
const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const load = require('./helpers/loadTypeScript.cjs')();
const catalog = load(path.resolve(__dirname, '../data/devices.ts'));
const legacy = load(path.resolve(__dirname, '../data/mockProducts.ts'));
const { parseListing } = load(path.resolve(__dirname, '../utils/listingParser.ts'));
const { createSavedListing, decodeSavedListings } = load(path.resolve(__dirname, '../utils/savedListings.ts'));

test('every legacy product retains its ID, prices and saved-listing lookup', () => {
  for (const product of legacy.PRODUCTS_DATABASE) {
    const resolved = catalog.getProductById(product.id);
    assert.ok(resolved, product.id);
    assert.equal(resolved.fairPrice, product.fairPrice);
    assert.equal(resolved.marketPriceMin, product.marketPriceMin);
    assert.equal(resolved.marketPriceMax, product.marketPriceMax);
    assert.equal(resolved.name, product.name);
    assert.equal(resolved.checklist, product.checklist);
    assert.equal(resolved.chronicIssues, product.chronicIssues);
  }
  assert.equal(new Set(catalog.BROWSABLE_PRODUCTS.map((p) => p.id)).size, catalog.BROWSABLE_PRODUCTS.length);
});

test('every priced model and every listed storage is discoverable through the shared UI search', () => {
  for (const device of catalog.getAllDevices()) {
    const products = catalog.searchCatalogProducts(device.model, 'phone', device.brand);
    assert.ok(products.length, device.model);
    if (device.releaseYear === 0) continue;
    for (const storage of device.variants.storage) {
      assert.ok(products.some((p) => p.name.includes(`(${storage}`)), `${device.model} ${storage}`);
    }
  }
});

test('model, compact, Turkish, capacity, brand and category filters compose before pagination', () => {
  for (const query of ['iPhone6', ' APPLE İPHONE 6 ', 'iphone 6 16 GB']) {
    const products = catalog.searchCatalogProducts(query, 'phone', ' apple ');
    assert.ok(products.some((p) => /^Apple iPhone 6 \(16GB/.test(p.name)), query);
    assert.ok(products.every((p) => p.brand === 'Apple' && p.category === 'phone'));
    assert.ok(products.every((p) => /iPhone 6(?:s|\s)/.test(p.name)), 'model 6 must not match capacities 64GB or model 16');
  }
  assert.ok(catalog.searchCatalogProducts('galaxy s24+', 'phone', 'Samsung').length);
  assert.ok(catalog.searchCatalogProducts('iPhone17ProMax 2TB', 'phone', 'Apple').length);
  assert.equal(catalog.searchCatalogProducts('iPhone 6', 'phone', 'Samsung').length, 0);
  assert.equal(catalog.searchCatalogProducts('', 'gpu', 'Apple').length, 0);
  assert.equal(catalog.searchCatalogProducts('!!!').length, 0);
  assert.equal(catalog.searchCatalogProducts('', 'phone', 'unknown').length, 0);
  assert.equal(catalog.searchProducts('', 'all', 0).length, 0);
});

test('concept is discoverable but cannot enter valuation or saved product lookup', () => {
  const concept = catalog.searchCatalogProducts('iPhone18ProMax', 'phone', 'Apple');
  assert.equal(concept.length, 1);
  assert.equal(concept[0].fairPrice, 0);
  assert.match(concept[0].name, /Konsept/);
  assert.equal(catalog.getProductById(concept[0].id), undefined);
  assert.equal(catalog.searchProducts('iPhone18ProMax').length, 0);
});

test('new iPhone and foldable variants reach parser and saved-listing restoration', () => {
  for (const title of ['Apple iPhone 6 (16GB)', 'Apple iPhone 17 Pro Max (2TB)', 'Samsung Galaxy Z Fold6 (256GB)']) {
    const parsed = parseListing(`${title} fiyat 25.000 TL`);
    assert.ok(parsed.product, title);
    assert.equal(parsed.product.name, title);
    assert.equal(catalog.getProductById(parsed.product.id), parsed.product);
    const saved = createSavedListing({ productId: parsed.product.id, title, askedPrice: 25000, condition: 'clean', valuationCondition: 'boxed' }, []);
    const decoded = decodeSavedListings(JSON.stringify([saved]));
    assert.equal(decoded.items.length, 1);
    assert.equal(decoded.skipped, 0);
    assert.equal(decoded.items[0].productId, parsed.product.id);
  }
});
