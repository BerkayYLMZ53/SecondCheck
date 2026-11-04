/* global __dirname */
const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const load = require('./helpers/loadTypeScript.cjs')();
const { estimateBattery } = load(path.resolve(__dirname, '../utils/batteryEstimator.ts'));
const { getAllDevices } = load(path.resolve(__dirname, '../data/devices.ts'));
const { parseDeviceListing } = load(path.resolve(__dirname, '../utils/deviceListingParser.ts'));
const { calculateDeviceValuation } = load(path.resolve(__dirname, '../utils/deviceValuation.ts'));
const { calculateBargain } = load(path.resolve(__dirname, '../utils/bargaining.ts'));
const { buildPdfReport } = load(path.resolve(__dirname, '../utils/pdfReportHtml.ts'));
const { buildListingAnalysisReport } = load(path.resolve(__dirname, '../utils/listingAnalysisReport.ts'));
const { emptyLabResults, initialInspectionFacts } = load(path.resolve(__dirname, '../utils/inspection.ts'));

test('exact health boundaries and requested labels', () => {
  for (const health of [85, 86, 100]) {
    const estimate = estimateBattery('iPhone 13 Pro Max', health);
    assert.equal(estimate.condition, 'ideal');
    assert.equal(estimate.deduction, 0);
    assert.equal(estimate.label, 'Kondisyon: İdeal / Değişim İhtiyacı Yok');
  }
  for (const health of [80, 82, 84]) {
    const estimate = estimateBattery('iPhone 13 Pro Max', health);
    assert.equal(estimate.condition, 'moderate');
    assert.equal(estimate.months.min, 4); assert.equal(estimate.months.max, 7);
    assert.equal(estimate.deduction, 3800);
    assert.match(estimate.label, /4-7 Ay/);
  }
  for (const health of [0, 1, 79]) {
    assert.equal(estimateBattery('iPhone 13 Pro Max', health).condition, 'critical');
  }
});

test('every Apple/Samsung model remains within the requested model budget band', () => {
  for (const device of getAllDevices().filter((d) => d.releaseYear > 0 && ['Apple', 'Samsung'].includes(d.brand))) {
    const estimate = estimateBattery(device, 82);
    const [min, max] = device.brand === 'Apple' ? [2200, 4800] : [1500, 3200];
    assert.ok(estimate.replacementCost >= min && estimate.replacementCost <= max, device.model);
    assert.equal(estimate.deduction, estimate.replacementCost);
  }
  assert.equal(estimateBattery('iPhone 6', 82).replacementCost, 2200);
  assert.equal(estimateBattery('Samsung Galaxy S24 Ultra', 82).replacementCost, 3200);
  assert.ok(estimateBattery('iPhone 17 Pro Max', 82).replacementCost > estimateBattery('iPhone 6', 82).replacementCost);
});

test('unknown, invalid, unsupported and concept data never invent a fee', () => {
  for (const health of [undefined, NaN, Infinity, -1, 101]) {
    const estimate = estimateBattery('iPhone 13 Pro Max', health);
    assert.equal(estimate.condition, 'unknown');
    assert.equal(estimate.deduction, 0);
  }
  for (const model of [null, 'Unknown model', 'iPhone 18 Pro Max (Konsept / Öngörü)', 'Xiaomi 13']) {
    const estimate = estimateBattery(model, 79);
    assert.equal(estimate.replacementCost, undefined);
    assert.equal(estimate.deduction, 0);
  }
});

test('one ledger drives offer, PDF and plain text without double battery or screen deduction', () => {
  const result = parseDeviceListing('iphone 13 pro max 256GB pil 82 fiyat 35000 TL');
  const facts = { ...initialInspectionFacts(result), screenReplaced: true, trueTone: 'fail', cosmeticDamage: true };
  const valuation = calculateDeviceValuation(result, facts);
  assert.equal(valuation.marketValue, 35000);
  assert.equal(valuation.battery.deduction, 3800);
  assert.equal(valuation.requestedDeduction, 9300);
  assert.equal(valuation.deductions.filter((d) => d.id === 'battery').length, 1);
  assert.equal(valuation.deductions.filter((d) => d.id === 'screen').length, 1);
  assert.equal(valuation.fairOffer, 25700);
  assert.equal(calculateBargain(result, facts).offer, 25700);
  const input = { result, checked: new Set(), lab: emptyLabResults(), facts, details: {color:'Mavi', imeiLast4:''} };
  const html = buildPdfReport(input, '12345678-abcd', new Date('2026-11-04T12:00:00Z')).html;
  for (const expected of ['SECONDCHECK - DONANIM EKSPERTİZ &amp; DEĞERLEME RAPORU', 'Donanım &amp; Pil Durumu', '4-7 Ay', '3.800 TL', '9.300 TL', '25.700 TL', 'Tavsiye Edilen Adil Alım/Teklif Fiyatı', 'Bu rapor SecondCheck AI Değerleme Motoru tarafından üretilmiştir.']) assert.ok(html.includes(expected), expected);
  const text = buildListingAnalysisReport(result, new Set(), '', new Date(), input.lab, facts).plainText;
  assert.ok(text.includes('25.700 TL'));
});

test('market-based fair value works without an asking price and never drops below zero', () => {
  const result = parseDeviceListing('iphone 6 16GB pil 79');
  const facts = { ...initialInspectionFacts(result), cosmeticDamage: true, screenReplaced: true };
  const valuation = calculateDeviceValuation(result, facts);
  assert.equal(valuation.marketValue, 2500);
  assert.equal(valuation.totalDeduction, 2500);
  assert.equal(valuation.fairOffer, 0);
  assert.equal(calculateBargain(result, facts).offer, undefined);
  assert.equal(calculateDeviceValuation({...result, detectedBattery:undefined}, initialInspectionFacts(result)).battery.deduction, 0);
});

test('PDF refuses invalid battery data instead of publishing misleading values', () => {
  const result = parseDeviceListing('iphone 13');
  result.detectedBattery = 101;
  assert.throws(() => buildPdfReport({result, checked:new Set(), lab:emptyLabResults(), facts:initialInspectionFacts(result), details:{color:'',imeiLast4:''}}, '12345678-abcd'), /Pil sağlığı/);
});
