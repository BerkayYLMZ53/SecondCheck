/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');
const load = require('./helpers/loadTypeScript.cjs')();
const { buildVisualInspection, applyVisualInspection, isSafeEvidencePhoto, visualScoreLabel } = load(path.resolve(__dirname, '../utils/visualInspection.ts'));
const { calculateTrustScore } = load(path.resolve(__dirname, '../utils/trustScore.ts'));
const { parseDeviceListing } = load(path.resolve(__dirname, '../utils/deviceListingParser.ts'));
const { initialInspectionFacts, emptyLabResults } = load(path.resolve(__dirname, '../utils/inspection.ts'));
const { buildPdfReport } = load(path.resolve(__dirname, '../utils/pdfReportHtml.ts'));
const { buildListingAnalysisReport } = load(path.resolve(__dirname, '../utils/listingAnalysisReport.ts'));
const { createShareableReport, buildReportCardSvg } = load(path.resolve(__dirname, '../utils/shareableReport.ts'));
const photo = () => ({ dataUri: 'data:image/jpeg;base64,YWJjZA==', width: 800, height: 600, source: 'upload', recordedAt: '2026-11-03T12:00:00Z' });
const photos = () => ({ chassis: photo(), corners: photo() });
const guide = { angle: 0, widthPercent: 80, heightPercent: 32 };
const clean = () => parseDeviceListing('iphone 13 pro max 256GB 35000 TL pil 95 kutulu faturalı garantili değişensiz');
const all = (result) => new Set(result.matchedDevice.criticalChecks.map((_, index) => index));

test('the four exact cosmetic scores use chassis damage as the overriding condition', () => {
  for (const [chassis, cosmetic, expected] of [['straight','pristine',10],['straight','hairline',8.5],['straight','dented',6.5],['bent','pristine',4],['bent','hairline',4],['bent','dented',4]]) {
    assert.equal(buildVisualInspection(chassis, cosmetic, photos(), guide).score, expected);
  }
  assert.match(visualScoreLabel(buildVisualInspection('straight','hairline',photos(),guide)), /8,5\/10/);
});

test('two bounded local JPEG photos and valid observations are mandatory', () => {
  for (const bad of ['https://example.com/photo.jpg','javascript:alert(1)','data:image/svg+xml;base64,YWJjZA==','data:image/jpeg;base64,abc" onerror="bad','data:image/jpeg;base64,' + 'A'.repeat(2_000_001)]) {
    const p = photo(); p.dataUri = bad;
    assert.equal(isSafeEvidencePhoto(p), false);
    assert.throws(() => buildVisualInspection('straight','pristine',{chassis:p,corners:photo()},guide), /fotoğraf/);
  }
  for (const patch of [{width:0},{height:Infinity},{width:1281},{width:1.5},{recordedAt:'invalid'},{source:'remote'}]) assert.equal(isSafeEvidencePhoto({...photo(),...patch}),false);
  assert.throws(() => buildVisualInspection('unknown','pristine',photos(),guide), /gözlemi/);
  assert.throws(() => buildVisualInspection('straight','unknown',photos(),guide), /gözlemi/);
});

test('visual snapshots isolate evidence and clamp manual alignment without claiming a measurement', () => {
  const source = photos();
  const snapshot = buildVisualInspection('straight','hairline',source,{angle:99,widthPercent:NaN,heightPercent:-5});
  source.chassis.dataUri = 'broken';
  assert.equal(snapshot.photos.chassis.dataUri, photo().dataUri);
  assert.equal(snapshot.guide.angle,15); assert.equal(snapshot.guide.widthPercent,80); assert.equal(snapshot.guide.heightPercent,20);
  assert.equal(snapshot.source,'guided-user-observation');
});

test('visual defects update case status and apply a single stronger trust deduction', () => {
  const result = clean(); const facts = initialInspectionFacts(result);
  const baseline = calculateTrustScore(result,all(result),emptyLabResults(),facts).score;
  const scores = [];
  for (const [chassis, cosmetic, deduction] of [['straight','pristine',0],['straight','hairline',5],['straight','dented',12],['bent','pristine',25]]) {
    const updated = applyVisualInspection(facts,buildVisualInspection(chassis,cosmetic,photos(),guide));
    assert.equal(updated.caseCondition, deduction ? 'fail' : 'pass');
    const assessment = calculateTrustScore(result,all(result),emptyLabResults(),updated);
    assert.equal(assessment.adjustments.filter((entry) => ['cosmetic','visual-condition'].includes(entry.id)).length,deduction ? 1 : 0);
    if (deduction) { assert.notEqual(assessment.grade,'A+'); assert.equal(assessment.adjustments.find((entry) => entry.id === 'visual-condition').points,-deduction); }
    if (chassis === 'bent') assert.equal(assessment.grade,'C');
    scores.push(assessment.score);
  }
  assert.equal(scores[0],baseline); assert.ok(scores[1]>=scores[2] && scores[2]>scores[3]);
  assert.equal(facts.visualInspection,undefined);
});

test('PDF, text and PNG reports retain the same score and photo provenance', () => {
  const result = clean(); const checked = all(result); const lab = emptyLabResults();
  const facts = applyVisualInspection(initialInspectionFacts(result),buildVisualInspection('straight','hairline',photos(),guide));
  const trust = calculateTrustScore(result,checked,lab,facts);
  const html = buildPdfReport({result,checked,lab,facts,details:{color:'Mavi',imeiLast4:''}},'12345678-abcd').html;
  assert.match(html,/8,5\/10/); assert.match(html,/src="data:image\/jpeg;base64,/); assert.match(html,/Cihazdan yükleme/); assert.match(html,new RegExp(`${trust.score}/100`));
  const text = buildListingAnalysisReport(result,checked,'',new Date(),lab,facts).plainText;
  assert.match(text,/KASA KONDİSYONU: 8,5\/10/); assert.doesNotMatch(text,/data:image/);
  const snapshot = createShareableReport(result,checked,'',new Date(),lab,facts);
  assert.equal(snapshot.trust.score,trust.score); assert.match(buildReportCardSvg(snapshot,'square'),/Kasa 8,5\/10/);
});

function mockedModule(file, mocks, globals = {}) {
  const module = {exports:{}};
  const code = ts.transpileModule(fs.readFileSync(path.resolve(__dirname,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInNewContext(code,{module,exports:module.exports,require:(name)=>{if(!(name in mocks))throw new Error(`Unexpected import ${name}`);return mocks[name];},...globals});
  return module.exports;
}

test('photo processing resizes/re-encodes locally and releases image memory on success and failure', async () => {
  const calls = []; let imageReleased = 0; let contextReleased = 0; let fail = false;
  const context = {resize:(value)=>calls.push(value),renderAsync:async()=>{if(fail)throw new Error('Bad image');return {saveAsync:async(options)=>{assert.equal(options.base64,true);assert.equal(options.format,'jpeg');return {...photo(),base64:'YWJjZA=='};},release:()=>imageReleased++};},release:()=>contextReleased++};
  const cleaned = [];
  const mod = mockedModule('../utils/scannerPhoto.ts',{'expo-image-manipulator':{ImageManipulator:{manipulate:()=>context},SaveFormat:{JPEG:'jpeg'}},'./visualInspection':{isSafeEvidencePhoto},'./scannerPhotoCleanup':{cleanupScannerPhoto:(uri)=>{if(uri)cleaned.push(uri);}}});
  const normalized = await mod.prepareScannerPhoto({uri:'blob:local',width:4000,height:3000},'upload');
  assert.equal(calls[0].width,1280); assert.equal(calls[0].height,960); assert.equal(normalized.source,'upload');
  assert.equal(imageReleased,1); assert.equal(contextReleased,1);
  fail = true; await assert.rejects(mod.prepareScannerPhoto({uri:'file:local',width:100,height:100},'camera'),/Bad image/);
  assert.equal(contextReleased,2);
  assert.ok(cleaned.includes('file:local')); assert.ok(!cleaned.includes('blob:local'));
  await assert.rejects(mod.prepareScannerPhoto({uri:'https://external/image.jpg',width:100,height:100},'upload'),/cihazdan/);
});

function cameraHarness(getUserMedia) {
  let ready = 0; let error = ''; let cleanup;
  const element = {srcObject:null,readyState:2,videoWidth:1280,videoHeight:720,addEventListener(){},removeEventListener(){},play:async()=>{},pause(){}};
  const mod = mockedModule('../components/VisualScannerCamera.web.tsx',{
    react:{forwardRef:(fn)=>fn,useRef:()=>({current:element}),useImperativeHandle:(ref,fn)=>{ref.current=fn();},useEffect:(fn)=>{cleanup=fn();}},
    'react/jsx-runtime':{jsx:()=>null},
  },{navigator:{mediaDevices:{getUserMedia}},document:{createElement:()=>({width:0,height:0,getContext:()=>({drawImage(){}}),toDataURL:()=>photo().dataUri})}});
  const handle={current:null}; mod.default({onReady:()=>ready++,onError:(message)=>{error=message;}},handle);
  return {element,handle,cleanup:()=>cleanup(),get ready(){return ready;},get error(){return error;}};
}

test('web camera requests environment video without audio and releases tracks on close', async () => {
  let stopped=0;
  const stream={getTracks:()=>[{stop:()=>stopped++}]};
  const h=cameraHarness(async(constraints)=>{assert.equal(constraints.video.facingMode.ideal,'environment');assert.equal(constraints.audio,false);return stream;});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(h.ready,1); assert.equal(h.element.srcObject,stream);
  assert.equal((await h.handle.current.capture()).width,1280);
  h.cleanup(); assert.equal(stopped,1); assert.equal(h.element.srcObject,null);
});

test('late camera permission after modal close stops its stream without attaching it', async () => {
  let resolve; let stopped=0;
  const h=cameraHarness(()=>new Promise(r=>{resolve=r;})); h.cleanup();
  resolve({getTracks:()=>[{stop:()=>stopped++}]}); await new Promise(r=>setImmediate(r));
  assert.equal(stopped,1); assert.equal(h.ready,0); assert.equal(h.element.srcObject,null);
});

test('camera denial or missing hardware is surfaced for the photo-upload fallback', async () => {
  for (const message of ['Permission denied','No camera found']) {
    const h=cameraHarness(async()=>{throw new Error(message);});
    await new Promise(r=>setImmediate(r)); assert.equal(h.ready,0); assert.match(h.error,/Kamera kullanılamadı|Permission denied|No camera found/); h.cleanup();
  }
});
