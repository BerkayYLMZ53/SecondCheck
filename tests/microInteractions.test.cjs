/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const {test} = require('node:test');

test('reduced-motion preference uses one OS listener, ignores a stale query and releases its subscription', async () => {
  let subscriptions = 0; let removed = 0; let change; let resolveQuery;
  const cleanups = []; const notices = [];
  const mocks = {
    react: {useSyncExternalStore: (subscribe, snapshot) => {
      cleanups.push(subscribe(() => notices.push(snapshot()))); return snapshot();
    }},
    'react-native': {AccessibilityInfo: {
      addEventListener: (event, handler) => {
        assert.equal(event,'reduceMotionChanged'); subscriptions++; change=handler;
        return {remove:()=>removed++};
      },
      isReduceMotionEnabled: () => new Promise((resolve)=>{resolveQuery=resolve;}),
    }},
  };
  const module = {exports:{}};
  const source = ts.transpileModule(fs.readFileSync(path.resolve(__dirname,'../utils/useReducedMotion.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(source,{module,exports:module.exports,require:(name)=>mocks[name]});
  for(let index=0;index<100;index++) assert.equal(module.exports.useReducedMotion(),false);
  assert.equal(subscriptions,1);
  change(true);
  assert.equal(notices.length,100);
  assert.ok(notices.every(Boolean));
  resolveQuery(false); await Promise.resolve();
  assert.equal(module.exports.useReducedMotion(),true);
  cleanups.forEach((cleanup)=>cleanup());
  assert.equal(removed,1);
});
