/* global __dirname */
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');
const load = require('./helpers/loadTypeScript.cjs')();
const { getFieldTestSteps, buildFieldInspectionReport } = load(path.resolve(__dirname,'../utils/fieldInspection.ts'));
const { parseDeviceListing } = load(path.resolve(__dirname,'../utils/deviceListingParser.ts'));
const { calculateTrustScore } = load(path.resolve(__dirname,'../utils/trustScore.ts'));
const { initialInspectionFacts, emptyLabResults } = load(path.resolve(__dirname,'../utils/inspection.ts'));
const { buildListingAnalysisReport } = load(path.resolve(__dirname,'../utils/listingAnalysisReport.ts'));
const { createShareableReport } = load(path.resolve(__dirname,'../utils/shareableReport.ts'));
const { buildPdfReport } = load(path.resolve(__dirname,'../utils/pdfReportHtml.ts'));
const listing = (text='iphone 13 pro max 256GB pil 95 35000 TL kutulu faturalı garantili değişensiz') => parseDeviceListing(text);
const completed = (device) => getFieldTestSteps(device).map(step=>({...step,status:'pass',answeredAt:'2026-11-03T12:00:00Z'}));

test('field workflow has the exact six ordered groups and model-aware Turkish guidance',()=>{
  const iphone=getFieldTestSteps(listing().matchedDevice);
  assert.equal(iphone.length,6); assert.equal(iphone[0].id,'buttons'); assert.equal(iphone[5].id,'account');
  assert.match(iphone[1].instruction,/True Tone/); assert.match(iphone[0].spoken,/Birinci adım/); assert.match(iphone[5].instruction,/iCloud/);
  const galaxy=getFieldTestSteps(listing('s24u').matchedDevice);
  assert.match(galaxy[1].instruction,/True Tone aranmaz/); assert.match(galaxy[5].instruction,/Google/);
  assert.match(galaxy[3].instruction,/Modelde bulunan/);
  assert.match(getFieldTestSteps(listing('iphone 6').matchedDevice)[1].instruction,/True Tone aranmaz/);
});

test('only six sequential valid observations may replace the old report',()=>{
  const answers=completed(listing().matchedDevice);
  const report=buildFieldInspectionReport(answers);
  answers[0].status='fail'; assert.equal(report.results[0].status,'pass');
  for (const invalid of [answers.slice(0,5),[...answers,answers[0]],[answers[1],answers[0],...answers.slice(2)],answers.map((a,i)=>i? a:{...a,status:'pending'})]) assert.throws(()=>buildFieldInspectionReport(invalid),/Altı saha/);
});

test('all-pass field mode records observations without ticking unrelated catalog checks',()=>{
  const result=listing(); const facts=initialInspectionFacts(result); facts.fieldInspection=buildFieldInspectionReport(completed(result.matchedDevice));
  const checked=new Set(); const trust=calculateTrustScore(result,checked,emptyLabResults(),facts);
  assert.equal(trust.completed,0); assert.ok(trust.score<85); assert.equal(checked.size,0);
});

test('field faults affect trust once, with a high-risk cap for account lock',()=>{
  const result=listing(); const checked=new Set(result.matchedDevice.criticalChecks.map((_,i)=>i));
  const lab=emptyLabResults(); const facts=initialInspectionFacts(result);
  const answers=completed(result.matchedDevice); answers[2].status='fail';
  facts.fieldInspection=buildFieldInspectionReport(answers);
  let trust=calculateTrustScore(result,checked,lab,facts);
  assert.equal(trust.adjustments.find(item=>item.id==='field-audio').points,-10);
  lab.audio.status='fail'; trust=calculateTrustScore(result,checked,lab,facts);
  assert.equal(trust.adjustments.filter(item=>['field-audio','lab-audio'].includes(item.id)).length,1);
  answers[5].status='fail'; facts.fieldInspection=buildFieldInspectionReport(answers);
  trust=calculateTrustScore(result,checked,lab,facts); assert.equal(trust.grade,'C'); assert.ok(trust.score<=64);
});

test('field results and updated trust stay consistent in text, PNG and PDF reports',()=>{
  const result=listing(); const checked=new Set(result.matchedDevice.criticalChecks.map((_,i)=>i)); const lab=emptyLabResults();
  const facts=initialInspectionFacts(result); const answers=completed(result.matchedDevice); answers[3].status='fail';
  facts.fieldInspection=buildFieldInspectionReport(answers);
  const trust=calculateTrustScore(result,checked,lab,facts);
  const text=buildListingAnalysisReport(result,checked,'',new Date(),lab,facts).plainText;
  assert.match(text,/SESLİ SAHA TESTİ/); assert.match(text,/Sorun var: Kameralar ve Flaş/);
  const snapshot=createShareableReport(result,checked,'',new Date(),lab,facts); assert.equal(snapshot.trust.score,trust.score);
  const pdf=buildPdfReport({result,checked,lab,facts,details:{color:'',imeiLast4:''}},'12345678-abcd').html;
  assert.match(pdf,/Sesli saha testi/); assert.match(pdf,new RegExp(`${trust.score}/100`));
});

function moduleMock(file,mocks,globals={}) {
  const module={exports:{}};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:name=>mocks[name],...globals});
  return module.exports;
}
function webHarness({unsupported=false,throws=false}={}) {
  const timers=new Map(); let timerId=0; const events={}; const utterances=[]; const feedback=[]; let cancels=0;
  let voices=[{lang:'en-US',localService:true},{lang:'tr-TR',localService:true,name:'Türkçe'}];
  const synth={getVoices:()=>voices,speak:utterance=>{if(throws)throw new Error('Blocked');utterances.push(utterance);},cancel:()=>cancels++,addEventListener:(name,fn)=>{events[name]=fn;},removeEventListener:(name)=>delete events[name]};
  const doc={hidden:false,addEventListener:(name,fn)=>{events[name]=fn;},removeEventListener:(name)=>delete events[name]};
  const win={...(unsupported?{}:{speechSynthesis:synth,SpeechSynthesisUtterance:class {constructor(text){this.text=text;}}}),addEventListener:(name,fn)=>{events[name]=fn;},removeEventListener:(name)=>delete events[name]};
  const {createFieldSpeech}=moduleMock('../utils/fieldSpeech.web.ts',{}, {window:win,document:doc,setTimeout:(fn,ms)=>{timers.set(++timerId,{fn,ms});return timerId;},clearTimeout:id=>timers.delete(id)});
  const controller=createFieldSpeech((status,message)=>feedback.push({status,message}));
  return {controller,utterances,feedback,timers,events,doc,get cancels(){return cancels;},setVoices:(value)=>{voices=value;events.voiceschanged?.();}};
}

test('web speech uses tr-TR, a local Turkish voice, a calm rate and one utterance per step',()=>{
  const h=webHarness(); h.controller.speak('Birinci adım');
  const first=h.utterances[0]; assert.equal(first.lang,'tr-TR'); assert.equal(first.voice.name,'Türkçe'); assert.equal(first.rate,0.9);
  first.onstart(); assert.equal(h.feedback.at(-1).status,'speaking');
  const stale=first.onerror; h.controller.speak('İkinci adım'); stale();
  assert.equal(h.utterances.length,2); assert.equal(h.utterances.at(-1).text,'İkinci adım'); assert.notEqual(h.feedback.at(-1).status,'silent');
  h.controller.dispose(); assert.equal(h.timers.size,0);
});

test('unsupported or blocked web speech degrades to silent mode without throwing',()=>{
  for(const options of [{unsupported:true},{throws:true}]) {
    const h=webHarness(options); assert.doesNotThrow(()=>h.controller.speak('Test')); assert.equal(h.feedback.at(-1).status,'silent'); h.controller.dispose();
  }
});

test('silent autoplay failures time out and replay can use voices loaded later',()=>{
  const h=webHarness(); h.setVoices([]); h.controller.speak('Test');
  [...h.timers.values()].find(timer=>timer.ms===4500).fn(); assert.equal(h.feedback.at(-1).status,'silent');
  h.setVoices([{lang:'tr-TR',localService:true,name:'Yeni Türkçe'}]); h.controller.speak('Tekrar');
  assert.equal(h.utterances.at(-1).voice.name,'Yeni Türkçe'); h.controller.dispose();
});

test('muting, backgrounding and disposal cancel speech and ignore stale events',()=>{
  const h=webHarness(); h.controller.speak('Test'); const stale=h.utterances[0].onstart;
  h.controller.cancel(); stale(); assert.notEqual(h.feedback.at(-1).status,'speaking');
  h.controller.speak('Tekrar'); h.doc.hidden=true; h.events.visibilitychange(); assert.equal(h.feedback.at(-1).status,'paused');
  h.controller.dispose(); const count=h.feedback.length; h.controller.speak('Kapandı'); assert.equal(h.feedback.length,count); assert.equal(h.timers.size,0); assert.equal(Object.keys(h.events).length,0);
});

test('native speech uses Turkish and cancels pending work on close',async()=>{
  const utterances=[]; const feedback=[]; const timers=new Map(); let id=0; let appState;
  const {createFieldSpeech}=moduleMock('../utils/fieldSpeech.ts',{'expo-speech':{stop:async()=>{},speak:(text,options)=>utterances.push({text,options})},'react-native':{AppState:{addEventListener:(_,fn)=>{appState=fn;return {remove(){}};}}}}, {setTimeout:(fn,ms)=>{timers.set(++id,{fn,ms});return id;},clearTimeout:key=>timers.delete(key)});
  const speech=createFieldSpeech((status,message)=>feedback.push({status,message}));
  speech.speak('Birinci adım'); await new Promise(resolve=>setImmediate(resolve));
  assert.equal(utterances[0].options.language,'tr-TR'); utterances[0].options.onStart(); assert.equal(feedback.at(-1).status,'speaking');
  appState('background'); assert.equal(feedback.at(-1).status,'paused');
  speech.speak('Kapatılacak adım'); speech.dispose(); await new Promise(resolve=>setImmediate(resolve));
  assert.equal(utterances.length,1); assert.equal(timers.size,0);
});
