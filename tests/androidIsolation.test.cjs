/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

function load(file, modules, globals = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: name => {
    if (name in modules) return modules[name];
    if (name === 'react/jsx-runtime') return require(name);
    throw new Error(`Unexpected eager module: ${name}`);
  }, ...globals });
  return module.exports;
}

test('Android first mount hides splash and continues without awaiting native completion or loading screens', () => {
  const effects = [];
  const timers = [];
  let mounted = false;
  let hidden = 0;
  const { default: App } = load('../App.android.tsx', {
    react: { useState: () => [mounted, value => { mounted = value; }], useEffect: effect => effects.push(effect) },
    'react-native': { View: 'View', StyleSheet: { create: value => value } },
    'expo-status-bar': {},
    'react-native-safe-area-context': {},
    './context/ThemeContext': {},
    './data/devices': {},
    './components/ErrorBoundary': { default: 'Boundary', __esModule: true },
    './utils/startup': { hideNativeSplash: () => { hidden++; return new Promise(() => {}); } },
  }, { setTimeout: callback => { timers.push(callback); return 1; }, clearTimeout: () => {} });
  const first = App();
  assert.equal(first.props.children.type, 'View');
  const cleanup = effects[0]();
  assert.equal(hidden, 1);
  assert.equal(mounted, false);
  timers[0]();
  assert.equal(mounted, true);
  assert.equal(typeof cleanup, 'function');
});

test('Android startup never holds splash and retries safely after synchronous or async native failures', async () => {
  for (const fail of [() => { throw new Error('native unavailable'); }, () => Promise.reject(new Error('native rejected'))]) {
    let calls = 0;
    const timers = [];
    const { beginStartup, hideNativeSplash } = load('../utils/startup.android.ts', {
      'react-native': { Platform: { OS: 'android' } },
      'expo-splash-screen': {
        preventAutoHideAsync: () => { throw new Error('Android must not hold splash'); },
        hideAsync: () => { calls++; return fail(); },
      },
    }, { setTimeout: (callback, delay) => timers.push({ callback, delay }), console: { warn: () => {} } });
    beginStartup();
    await assert.doesNotReject(hideNativeSplash());
    assert.equal(timers[0].delay, 2500);
    timers[0].callback();
    await Promise.resolve();
    assert.equal(calls, 2);
  }
});
