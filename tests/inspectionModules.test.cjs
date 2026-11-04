/* global __dirname */
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');
const load = require('./helpers/loadTypeScript.cjs')();
const { parseDeviceListing } = load(path.resolve(__dirname, '../utils/deviceListingParser.ts'));
const { calculateBargain } = load(path.resolve(__dirname, '../utils/bargaining.ts'));
const { emptyLabResults, initialInspectionFacts, laboratoryComplete } = load(path.resolve(__dirname, '../utils/inspection.ts'));
const { calculateTrustScore } = load(path.resolve(__dirname, '../utils/trustScore.ts'));
const { buildPdfReport } = load(path.resolve(__dirname, '../utils/pdfReportHtml.ts'));
const { createShareableReport } = load(path.resolve(__dirname, '../utils/shareableReport.ts'));
const { buildListingAnalysisReport } = load(path.resolve(__dirname, '../utils/listingAnalysisReport.ts'));
const clean = () => parseDeviceListing('iphone 13 pro max 256GB pil 95 kutulu faturalı 35000 TL değişensiz');
const all = (result) => new Set(result.matchedDevice?.criticalChecks.map((_, index) => index) ?? []);
const input = (result = clean()) => ({ result, checked: all(result), lab: emptyLabResults(), facts: initialInspectionFacts(result), details: { color: 'Sierra Blue', imeiLast4: '1234' } });

test('bargaining uses model battery budget and counts the screen only once', () => {
  const data = input(parseDeviceListing('iphone 13 pro max pil 79 35000 TL'));
  Object.assign(data.facts, { missingDocuments: true, screenReplaced: true, trueTone: 'fail', cosmeticDamage: true });
  const bargain = calculateBargain(data.result, data.facts);
  assert.equal(bargain.deductions.length, 4);
  assert.equal(bargain.requestedDeduction, 10300);
  assert.equal(bargain.offer, 24700);
  assert.equal(bargain.saving, 10300);
  assert.match(bargain.message, /24\.700 TL/);
});

test('unknown paperwork and cosmetic condition are not automatically defects', () => {
  const result = parseDeviceListing('iphone 13 pro max 35000 TL');
  const facts = initialInspectionFacts(result);
  assert.equal(facts.missingDocuments, false);
  assert.equal(facts.cosmeticDamage, false);
  assert.equal(facts.caseCondition, 'pending');
  assert.equal(calculateBargain(result, facts).offer, 35000);
  assert.equal(initialInspectionFacts(result, 'kutu ve fatura yok').missingDocuments, true);
  assert.equal(initialInspectionFacts(result, 'kutusuz faturasız').missingDocuments, true);
});

test('battery threshold is strict; missing or invalid prices do not create a message', () => {
  const result = clean();
  result.detectedBattery = 80;
  assert.equal(calculateBargain(result, initialInspectionFacts(result)).requestedDeduction, 3800);
  result.detectedBattery = 85;
  assert.equal(calculateBargain(result, initialInspectionFacts(result)).requestedDeduction, 0);
  result.detectedBattery = 79;
  assert.equal(calculateBargain(result, initialInspectionFacts(result)).requestedDeduction, 3800);
  for (const price of [undefined, NaN, Infinity, -100, 0]) {
    result.detectedPrice = price;
    assert.equal(calculateBargain(result, initialInspectionFacts(result)).offer, undefined);
    assert.equal(calculateBargain(result, initialInspectionFacts(result)).message, '');
  }
  result.detectedPrice = 1000;
  const bargain = calculateBargain(result, initialInspectionFacts(result));
  assert.equal(bargain.offer, 0); assert.equal(bargain.saving, 1000);
});

test('lab results are independent; skipping is never a pass', () => {
  const lab = emptyLabResults();
  lab.pixels.status = 'pass';
  assert.equal(lab.touch.status, 'pending');
  assert.equal(laboratoryComplete(lab), false);
  for (const id of Object.keys(lab)) lab[id].status = 'unsupported';
  assert.equal(laboratoryComplete(lab), true);
  assert.ok(Object.values(lab).every((entry) => entry.status !== 'pass'));
});

test('observed faults lower the same trust assessment used by the UI and both report types', () => {
  const data = input();
  const original = calculateTrustScore(data.result, data.checked, data.lab, data.facts).score;
  data.lab.touch = { status: 'fail', note: 'Kör nokta', completedAt: '2026-11-03T12:00:00Z' };
  data.facts.trueTone = 'fail';
  const trust = calculateTrustScore(data.result, data.checked, data.lab, data.facts);
  assert.ok(trust.score < original);
  assert.notEqual(trust.grade, 'A+');
  assert.ok(trust.adjustments.some((entry) => entry.id === 'lab-touch' && entry.points === -20));
  const text = buildListingAnalysisReport(data.result, data.checked, '', new Date(), data.lab, data.facts).plainText;
  assert.match(text, new RegExp(`GÜVEN SKORU: ${trust.score}/100`));
  assert.match(text, /Kör nokta/);
  const share = createShareableReport(data.result, data.checked, '', new Date(), data.lab, data.facts);
  assert.equal(share.trust.score, trust.score);
  assert.match(buildPdfReport(data, '12345678-abcd', new Date('2026-11-03T12:00:00Z')).html, new RegExp(`${trust.score}/100`));
});

test('a confirmed screen repair prevents A+ even if the listing said unchanged', () => {
  const data = input(); data.facts.screenReplaced = true;
  const trust = calculateTrustScore(data.result, data.checked, data.lab, data.facts);
  assert.notEqual(trust.grade, 'A+');
  assert.ok(trust.adjustments.some((entry) => entry.id === 'observed-screen'));
});

test('PDF escapes input, uses A4, retains Turkish text and never exports a full IMEI', () => {
  const data = input();
  data.details.color = '<script>alert("x")</script> & mavi';
  data.details.imeiLast4 = '123456789012345';
  data.lab.pixels.note = '<img src=x onerror=bad()> görüntü';
  const report = buildPdfReport(data, '12345678-abcd', new Date('2026-11-03T12:00:00Z'));
  assert.equal(report.code, 'SC-2026-12345678-ABCD');
  assert.match(report.html, /size:A4/);
  assert.match(report.html, /lang="tr"/);
  assert.match(report.html, /&lt;script&gt;/);
  assert.match(report.html, /&lt;img/);
  assert.doesNotMatch(report.html, /<script>|<img src=x|123456789012345/);
  assert.match(report.html, /Kontrol edilmedi/);
  assert.match(report.html, /Resmi servis belgesi, dijital imza/);
  assert.match(report.html, /✓ SecondCheck/);
});

test('PDF rejects missing/concept devices and unsafe report identifiers', () => {
  assert.throws(() => buildPdfReport(input(), '<script>'), /kimliği/);
  assert.throws(() => buildPdfReport(input(parseDeviceListing('unknown')), '12345678'), /gerçek/);
  assert.throws(() => buildPdfReport(input(parseDeviceListing('iphone 18 pro max')), '12345678'), /gerçek/);
});

function moduleWithMocks(file, mocks, globals = {}) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { module, exports: module.exports, require: (name) => { if (!(name in mocks)) throw new Error(`Unexpected import ${name}`); return mocks[name]; }, setTimeout, clearTimeout, ...globals });
  return module.exports;
}

test('web PDF export opens a printable document and handles a popup blocker', async () => {
  let opened = false; let revoked = false;
  const globals = { crypto: { randomUUID: () => '12345678-abcd' }, Blob, URL: { createObjectURL: () => 'blob:test', revokeObjectURL: () => { revoked = true; } }, window: { open: () => { opened = true; return null; } } };
  const mod = moduleWithMocks('../utils/generatePdfReport.web.ts', { './pdfReportHtml': { buildPdfReport } }, globals);
  await assert.rejects(mod.generatePdfReport(input()), /engellendi/);
  assert.equal(opened, true); assert.equal(revoked, true);
});

test('native PDF export shares the PDF and removes temporary output even on rejection', async () => {
  let removed = false; let shared = false;
  const mod = moduleWithMocks('../utils/generatePdfReport.ts', {
    'expo-print': { printToFileAsync: async (options) => { assert.equal(options.width, 595); return { uri: 'file:report.pdf' }; } },
    'expo-sharing': { isAvailableAsync: async () => true, shareAsync: async (_, options) => { shared = options.mimeType === 'application/pdf'; throw new Error('Sharing failed'); } },
    'expo-crypto': { randomUUID: () => '12345678-abcd' },
    'expo-file-system': { File: class { delete() { removed = true; } } }, './pdfReportHtml': { buildPdfReport },
  });
  await assert.rejects(mod.generatePdfReport(input()), /Sharing failed/);
  assert.equal(shared, true); assert.equal(removed, true);
});

test('native export prints the current battery valuation, shares PDF and cleans cache on success', async () => {
  const data = input(); data.result.detectedBattery = 82;
  let shared = false; let removed = false;
  const mod = moduleWithMocks('../utils/generatePdfReport.ts', {
    'expo-print': { printToFileAsync: async ({html}) => {
      assert.ok(html.includes('3.800 TL')); assert.ok(html.includes('31.200 TL'));
      return {uri:'file:report.pdf'};
    } },
    'expo-sharing': { isAvailableAsync: async () => true, shareAsync: async (uri, options) => {
      assert.equal(uri, 'file:report.pdf'); assert.equal(options.mimeType, 'application/pdf');
      assert.equal(options.UTI, 'com.adobe.pdf'); shared = true;
    } },
    'expo-crypto': { randomUUID: () => '12345678-abcd' },
    'expo-file-system': { File: class { delete() { removed = true; } } }, './pdfReportHtml': { buildPdfReport },
  });
  const code = await mod.generatePdfReport(data);
  assert.match(code, /^SC-\d{4}-12345678-ABCD$/);
  assert.equal(shared, true); assert.equal(removed, true);
});

function webSignalsHarness({ unsupported = false, vibration = false } = {}) {
  const states = [];
  const cleanups = [];
  let oscillator;
  let closed = 0;
  let phase = 'running';
  const frequencies = [];
  const listeners = {};
  class AudioContextMock {
    currentTime = 0;
    get state() { return phase; }
    destination = {};
    resume() { return Promise.resolve(); }
    close() { closed++; phase = 'closed'; return Promise.resolve(); }
    createOscillator() {
      oscillator = { frequency: { setValueAtTime: (...args) => frequencies.push(args) }, connect: () => ({ connect: () => {} }), start() {}, stop(value) { this.stopTime = value; }, onended: null };
      return oscillator;
    }
    createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {} } }; }
  }
  const mod = moduleWithMocks('../utils/useLabSignals.web.ts', {
    react: {
      useState(initial) { const index = states.length; states.push(initial); return [initial, (value) => { states[index] = value; }]; },
      useRef: (current) => ({ current }), useCallback: (fn) => fn,
      useEffect: (fn) => { cleanups.push(fn()); },
    },
  }, {
    window: { ...(unsupported ? {} : { AudioContext: AudioContextMock }), addEventListener: (name, fn) => { listeners[name] = fn; }, removeEventListener() {} },
    document: { hidden: false, addEventListener: (name, fn) => { listeners[name] = fn; }, removeEventListener() {} },
    navigator: { vibrate: () => vibration },
  });
  const hook = mod.useLabSignals();
  return { hook, states, frequencies, listeners, get oscillator() { return oscillator; }, get closed() { return closed; }, cleanup: () => cleanups.forEach((fn) => fn?.()) };
}

test('Web Audio plays exactly 200 and 2000 Hz and requires completed playback before confirmation', async () => {
  const h = webSignalsHarness();
  await h.hook.startAudio();
  assert.equal(h.states[0], true); assert.equal(h.states[1], false);
  assert.deepEqual(h.frequencies.map((entry) => entry[0]), [200, 2000]);
  assert.equal(h.oscillator.stopTime, 4.3);
  h.oscillator.onended();
  assert.equal(h.states[0], false); assert.equal(h.states[1], true);
  assert.equal(h.closed, 1); h.cleanup();
});

test('stopping or unmounting cancels audio and late completion never passes a test', async () => {
  const h = webSignalsHarness();
  await h.hook.startAudio();
  const callback = h.oscillator.onended;
  h.hook.stop(); callback();
  assert.equal(h.states[1], false); assert.equal(h.closed, 1);
  h.cleanup();
  assert.equal(h.states[1], false);
});

test('unsupported audio and vibration are graceful and never reported healthy', async () => {
  const h = webSignalsHarness({ unsupported: true });
  await h.hook.startAudio();
  assert.equal(h.states[0], false); assert.equal(h.states[1], false);
  assert.match(h.states[2], /desteklemiyor/);
  assert.equal(await h.hook.vibrate(), false);
  assert.match(h.states[2], /kullanılamıyor/);
  h.cleanup();
});

test('touch-grid interpolation covers fast strokes and ignores out-of-bounds touches', () => {
  const { traceGridCells } = load(path.resolve(__dirname, '../utils/diagnosticGrid.ts'));
  const cells = traceGridCells({x:1,y:1}, {x:359,y:599}, 360, 600);
  assert.ok(cells.includes(0)); assert.ok(cells.includes(59));
  assert.ok(cells.length >= 10);
  assert.equal(traceGridCells({x:-100,y:-100}, {x:-10,y:-10}, 360, 600).length, 0);
});
