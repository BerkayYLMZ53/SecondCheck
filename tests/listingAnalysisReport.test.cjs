/* global __dirname */
const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const load = require('./helpers/loadTypeScript.cjs')();
const { parseDeviceListing } = load(path.resolve(__dirname, '../utils/deviceListingParser.ts'));
const { buildListingAnalysisReport, catalogDeviceName, listingMoney } = load(path.resolve(__dirname, '../utils/listingAnalysisReport.ts'));
const date = new Date('2026-11-03T10:00:00Z');

test('invalid amounts never render NaN or Infinity currency labels', () => {
  for (const amount of [NaN, Infinity, -Infinity]) assert.equal(listingMoney(amount), 'Belirtilmedi');
  assert.equal(listingMoney(114999), '114.999 TL');
  assert.equal(listingMoney(0), '0 TL');
});

test('report includes identity, prices, declarations and current-device checklist results', () => {
  const parsed = parseDeviceListing('ip 13 pm 256GB 25000 TL pil 85 kutulu faturalı garantili ekran değişti');
  const report = buildListingAnalysisReport(parsed, new Set([0, 2]), 'Temiz iPhone ilanı', date);
  assert.equal(report.deviceName, 'Apple iPhone 13 Pro Max');
  assert.equal(report.createdAt, date.toISOString());
  assert.match(report.dateLabel, /13:00:00/);
  assert.equal(report.completed.length, 2);
  assert.equal(report.completed[0], parsed.matchedDevice.criticalChecks[0]);
  assert.equal(report.completed.length + report.pending.length, parsed.matchedDevice.criticalChecks.length);
  for (const text of ['Temiz iPhone ilanı', '256 GB', '%85', '25.000 TL', '35.000 TL', 'Fırsat Fiyat', 'Kutu: Var', 'Fatura: Var', 'ekran degisti']) assert.ok(report.plainText.includes(text), text);
  for (const issue of parsed.matchedDevice.chronicIssues) assert.ok(report.plainText.includes(issue));
  assert.match(report.plainText, /\[x\] İşaretlendi/);
  assert.match(report.plainText, /\[ \] Henüz kontrol edilmedi/);
});

test('unchecked and out-of-range entries are never treated as failed tests', () => {
  const parsed = parseDeviceListing('s24u 256gb');
  const report = buildListingAnalysisReport(parsed, new Set([-1, 99999]), '', date);
  assert.equal(report.completed.length, 0);
  assert.equal(report.pending.length, parsed.matchedDevice.criticalChecks.length);
  assert.match(report.plainText, /0 \/ \d+ işaretlendi/);
  assert.match(report.plainText, /İşaretlenmeyen testler arıza anlamına gelmez/);
  assert.match(report.plainText, /İlan Fiyatı: Belirtilmedi/);
  assert.match(report.plainText, /Pil sağlığı: Belirtilmedi/);
});

test('reports are immutable snapshots after source data and selections change', () => {
  const parsed = parseDeviceListing('iphone 13 128gb 24000 TL');
  const checked = new Set([0]);
  const report = buildListingAnalysisReport(parsed, checked, '', date);
  const snapshot = JSON.stringify(report);
  checked.add(1);
  parsed.matchedDevice.criticalChecks[0] = 'changed';
  parsed.matchedDevice.chronicIssues[0] = 'changed';
  parsed.detectedPrice = 1;
  assert.equal(JSON.stringify(report), snapshot);
});

test('concept and unknown information stay explicit instead of showing zero-price opportunities', () => {
  const parsed = parseDeviceListing('iphone 18 pro max');
  const report = buildListingAnalysisReport(parsed, new Set(), '', date);
  assert.match(report.plainText, /Referans yok/);
  assert.match(report.plainText, /Fiyat karşılaştırması yapılamadı/);
  assert.ok(!report.plainText.includes('Fırsat Fiyat'));
  assert.match(report.plainText, /Yok \/ belirtilmedi/);
});

test('device names do not duplicate Xiaomi or Redmi brand prefixes', () => {
  assert.equal(catalogDeviceName(parseDeviceListing('xiaomi 14')), 'Xiaomi 14');
  assert.equal(catalogDeviceName(parseDeviceListing('redmi note 13')), 'Redmi Note 13');
  assert.equal(catalogDeviceName(parseDeviceListing('s24u')), 'Samsung Galaxy S24 Ultra');
});

test('report recomputes the current comparison including inclusive 15 percent limits', () => {
  const parsed = parseDeviceListing('iphone 13 20400 TL');
  parsed.priceComparison = { status: 'NORMAL', differencePercentage: 0 };
  assert.match(buildListingAnalysisReport(parsed, new Set(), '', date).plainText, /Durum: Fırsat Fiyat/);
  parsed.detectedPrice = 27600;
  assert.match(buildListingAnalysisReport(parsed, new Set(), '', date).plainText, /Durum: Piyasa Üstü/);
});

test('invalid device or report date is rejected explicitly', () => {
  const unknown = parseDeviceListing('bilinmeyen cihaz');
  assert.throws(() => buildListingAnalysisReport(unknown, new Set(), '', date), /cihaz eşleştirin/);
  const parsed = parseDeviceListing('iphone 13');
  assert.throws(() => buildListingAnalysisReport(parsed, new Set(), '', new Date('invalid')), /rapor tarihi/);
});
