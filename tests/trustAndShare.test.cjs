/* global __dirname */
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');
const load = require('./helpers/loadTypeScript.cjs')();
const { parseDeviceListing } = load(path.resolve(__dirname, '../utils/deviceListingParser.ts'));
const { calculateTrustScore, trustBand } = load(path.resolve(__dirname, '../utils/trustScore.ts'));
const { createShareableReport, buildReportCardSvg, reportCardSize } = load(path.resolve(__dirname, '../utils/shareableReport.ts'));
const { getDeviceTestGuides } = load(path.resolve(__dirname, '../utils/deviceTestGuides.ts'));
const clean = () => parseDeviceListing('iphone 13 pro max 256GB pil 95 kutulu faturalı garantili 35000 TL değişensiz');
const all = (listing) => new Set(listing.matchedDevice.criticalChecks.map((_, index) => index));
const date = new Date('2026-11-03T10:00:00Z');

test('trust bands use the requested exact boundaries and ring colors', () => {
  for (const [score, grade, color] of [[0,'C','#ef4444'],[64,'C','#ef4444'],[65,'B','#f59e0b'],[84,'B','#f59e0b'],[85,'A+','#10b981'],[100,'A+','#10b981']]) {
    assert.equal(trustBand(score).grade, grade);
    assert.equal(trustBand(score).color, color);
  }
});

test('uninspected claims cannot produce A+; all clean checks can reach 100', () => {
  const listing = clean();
  assert.equal(calculateTrustScore(listing, new Set()).score, 80);
  assert.equal(calculateTrustScore(listing, new Set()).grade, 'B');
  const assessment = calculateTrustScore(listing, all(listing));
  assert.equal(assessment.score, 100);
  assert.equal(assessment.grade, 'A+');
  assert.equal(assessment.provisional, false);
  const incomplete = all(listing); incomplete.delete(0);
  assert.ok(calculateTrustScore(listing, incomplete).score <= 84);
});

test('score adjustments expose screen, battery and paperwork reasons without inventing faults', () => {
  const listing = parseDeviceListing('iphone 13 pro max pil 75 kutulu faturalı ekran değişti');
  const score = calculateTrustScore(listing, new Set([-1,999]));
  assert.equal(score.completed, 0);
  assert.ok(score.adjustments.some((item) => item.id === 'screen' && item.points === -10));
  assert.ok(score.adjustments.some((item) => item.id === 'battery-low' && item.points === -5));
  assert.ok(score.adjustments.some((item) => item.id === 'documents' && item.points === 5));
  assert.equal(score.score, 60);
  assert.equal(score.grade, 'C');
  assert.ok(calculateTrustScore(listing, all(listing)).score <= 84);
});

test('unknown battery, concept devices and empty inspection lists stay provisional', () => {
  const listing = parseDeviceListing('iphone 13 pro max kutulu faturalı garantili');
  assert.ok(calculateTrustScore(listing, all(listing)).score <= 84);
  assert.equal(calculateTrustScore(parseDeviceListing('iphone 18 pro max'), new Set()).available, false);
  assert.equal(calculateTrustScore(parseDeviceListing('unknown'), new Set()).available, false);
  listing.matchedDevice.criticalChecks = [];
  assert.equal(calculateTrustScore(listing, new Set()).provisional, true);
});

test('price does not change physical trust and model risks do not imply unit defects', () => {
  const listing = clean();
  const reference = calculateTrustScore(listing, new Set()).score;
  listing.detectedPrice = 1;
  listing.matchedDevice.chronicIssues.push('A model risk is not a confirmed fault');
  assert.equal(calculateTrustScore(listing, new Set()).score, reference);
  listing.detectedBattery = NaN;
  const score = calculateTrustScore(listing, all(listing));
  assert.ok(Number.isInteger(score.score) && score.score >= 0 && score.score <= 100);
  assert.ok(score.score <= 84);
});

test('share snapshots require completed real-device checks and remain stable after changes', () => {
  const listing = clean();
  assert.throws(() => createShareableReport(listing, new Set(), '', date), /bütün kritik/);
  const checked = all(listing);
  const snapshot = createShareableReport(listing, checked, '', date);
  const before = JSON.stringify(snapshot);
  listing.matchedDevice.model = 'changed'; checked.clear();
  assert.equal(JSON.stringify(snapshot), before);
  assert.equal(snapshot.trust.score, 100);
  assert.ok(snapshot.confirmedChecks.some((line) => line.includes('True Tone')));
  assert.ok(!snapshot.confirmedChecks.some((line) => line.includes('Orijinal Batarya') || line.includes('Face ID Sağlam')));
  assert.throws(() => createShareableReport(parseDeviceListing('iphone 18 pro max'), new Set(), '', date), /geçerli bir cihaz/);
});

test('story and square cards are self-contained SVGs at exact export sizes', () => {
  const listing = clean();
  const snapshot = createShareableReport(listing, all(listing), '', date);
  for (const [format,height] of [['story',1920],['square',1080]]) {
    const svg = buildReportCardSvg(snapshot, format);
    assert.equal(reportCardSize(format).width, 1080);
    assert.equal(reportCardSize(format).height, height);
    assert.match(svg, new RegExp(`width="1080" height="${height}"`));
    assert.match(svg, /SecondCheck ile Doğrulandı/);
    assert.match(svg, /secondcheck.gen.tr/);
    assert.match(svg, /kullanıcı beyanıdır/);
    assert.ok(!svg.includes('<image') && !svg.includes('<foreignObject') && !svg.includes('<script'));
  }
});

test('SVG text escapes catalog content so markup cannot enter generated PNGs', () => {
  const listing = clean();
  const snapshot = createShareableReport(listing, all(listing), '', date);
  snapshot.deviceName = '<script>alert("x")</script> & cihaz';
  snapshot.confirmedChecks = ['<image href="https://evil.example"/>'];
  const svg = buildReportCardSvg(snapshot, 'story');
  assert.ok(svg.includes('&lt;script&gt;'));
  assert.ok(!svg.includes('<script>') && !svg.includes('<image href='));
});

test('30-second guides respect iPhone, Samsung and Redmi hardware differences', () => {
  const guides = (input) => getDeviceTestGuides(parseDeviceListing(input).matchedDevice);
  assert.match(guides('iphone 13').find((guide) => guide.id === 'screen').steps.join(' '), /True Tone.*Face ID/);
  const android = guides('s24u').find((guide) => guide.id === 'screen').steps.join(' ');
  assert.ok(!android.includes('True Tone') && !android.includes('Face ID'));
  assert.match(android, /parmak izi/);
  assert.match(guides('redmi note 10 pro').find((guide) => guide.id === 'camera').steps[2], /OIS bulunduğunu varsaymayın/);
  for (const guide of guides('iphone 13')) {
    assert.equal(guide.steps.length, 3);
    assert.match(guide.steps[2], /20–30 sn/);
  }
});

function mockedModule(relative, mocks, globals = {}) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, relative), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, ...globals, require: (name) => {
    assert.ok(name in mocks, name); return mocks[name];
  } });
  return module.exports;
}

test('all five haptic helpers use the requested Expo feedback and preserve legacy calls', async () => {
  const calls = [];
  const native = mockedModule('../utils/haptics.ts', {
    'react-native': { Platform: { OS:'ios' } },
    'expo-haptics': { ImpactFeedbackStyle:{Light:'light',Medium:'medium'}, NotificationFeedbackType:{Success:'success',Warning:'warning'},
      impactAsync:async (value)=>calls.push(value), notificationAsync:async(value)=>calls.push(value), selectionAsync:async()=>calls.push('selection') },
  });
  for (const kind of ['light','success','warning']) await native.playHaptic(kind);
  assert.deepEqual(calls, ['light','success','warning']);
  calls.length = 0;
  for (const helper of ['triggerLight','triggerMedium','triggerSuccess','triggerWarning','triggerSelection']) await native[helper]();
  assert.deepEqual(calls, ['light','medium','success','warning','selection']);
  const web = mockedModule('../utils/haptics.ts', { 'react-native':{Platform:{OS:'web'}}, 'expo-haptics':{} }, { navigator:{} });
  for (const helper of ['triggerLight','triggerMedium','triggerSuccess','triggerWarning','triggerSelection']) await web[helper]();
  const unavailable = mockedModule('../utils/haptics.ts', {
    'react-native':{Platform:{OS:'android'}},
    'expo-haptics':{ ImpactFeedbackStyle:{Light:'light'}, impactAsync:async()=>{throw new Error('unsupported');} },
  });
  await unavailable.playHaptic('light');
});

test('native PNG preparation writes base64, denied gallery permission is graceful, sharing stays optional', async () => {
  const writes = []; let saved = 0;
  class File {
    constructor(...parts) { this.uri = parts.join('/'); }
    async create() {}
    async write(base64, options) { writes.push([base64, options.encoding]); }
    async delete() {}
  }
  const api = mockedModule('../utils/reportImage.ts', {
    'expo-file-system':{File,Paths:{cache:'file:///cache'}},
    'expo-media-library':{requestPermissionsAsync:async()=>({granted:false}),Asset:{create:async()=>{saved++;}}},
    'expo-sharing':{isAvailableAsync:async()=>false},
  });
  const image = await api.prepareReportImage('<svg/>',1080,1920,'report.png',async()=> 'cG5n');
  assert.deepEqual(writes, [['cG5n','base64']]);
  assert.match(image.uri, /report.png$/);
  await assert.rejects(()=>api.saveReportImage(image), /izni gerekir/);
  assert.equal(saved,0);
  await assert.rejects(()=>api.shareReportImage(image,''), /paylaşım kullanılamıyor/);
  await assert.rejects(()=>api.prepareReportImage('',1080,1080,'bad.png'), /hazır değil/);
});

test('web sharing uses a prepared PNG file, unsupported browsers fall back and cancellation is not an error', async () => {
  const artifact = { uri:'blob:preview', filename:'report.png', blob:new Blob(['png'],{type:'image/png'}) };
  const unsupported = mockedModule('../utils/reportImage.web.ts', {}, { Blob, File, DOMException, navigator:{} });
  await assert.rejects(()=>unsupported.shareReportImage(artifact,''), /PNG Olarak Kaydet/);
  let payload;
  const sharing = mockedModule('../utils/reportImage.web.ts', {}, { Blob, File, DOMException, navigator:{
    canShare:()=>true,
    share:async (value)=>{ payload=value; },
  } });
  assert.equal(await sharing.shareReportImage(artifact,'Kontrol kaydı'), 'shared');
  assert.equal(payload.files[0].name,'report.png');
  assert.equal(payload.files[0].type,'image/png');
  const cancelled = mockedModule('../utils/reportImage.web.ts', {}, { Blob, File, DOMException, navigator:{
    canShare:()=>true,
    share:async()=>{throw new DOMException('Cancelled','AbortError');},
  } });
  assert.equal(await cancelled.shareReportImage(artifact,''),'cancelled');
});
