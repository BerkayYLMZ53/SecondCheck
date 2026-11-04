/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

function load(file, modules, globals = {}) {
  const module = { exports: {} };
  const compiled = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(compiled, {
    module, exports: module.exports,
    require: (name) => name in modules ? modules[name] : require(name),
    ...globals,
  });
  return module.exports;
}

function startup(os = 'android', overrides = {}) {
  const timers = [];
  const warnings = [];
  let hidden = 0;
  let held = 0;
  const api = load('../utils/startup.ts', {
    'react-native': { Platform: { OS: os } },
    'expo-splash-screen': {
      preventAutoHideAsync: () => { held++; return Promise.resolve(true); },
      hideAsync: () => { hidden++; return Promise.resolve(); },
      ...overrides,
    },
  }, { setTimeout: (callback, delay) => timers.push({ callback, delay }), console: { warn: (...args) => warnings.push(args) } });
  return { api, timers, warnings, hidden: () => hidden, held: () => held };
}

test('watchdog releases native splash after 2.5s even when the hold promise never settles', async () => {
  const app = startup('android', { preventAutoHideAsync: () => new Promise(() => {}) });
  app.api.beginStartup();
  assert.equal(app.timers.length, 1);
  assert.equal(app.timers[0].delay, 2500);
  app.timers[0].callback();
  await Promise.resolve();
  assert.equal(app.hidden(), 1);
});

test('synchronous and rejected splash holds cannot abort app registration', async () => {
  for (const fail of [() => { throw new Error('native hold failed'); }, () => Promise.reject(new Error('native hold failed'))]) {
    const app = startup('android', { preventAutoHideAsync: fail });
    assert.doesNotThrow(() => app.api.beginStartup());
    await Promise.resolve();
    assert.equal(app.warnings.length, 1);
    app.timers[0].callback();
    assert.equal(app.hidden(), 1);
  }
});

test('failed native hide is handled and watchdog can retry', async () => {
  let calls = 0;
  const app = startup('android', { hideAsync: () => { if (++calls === 1) throw new Error('not attached yet'); return Promise.resolve(); } });
  app.api.beginStartup();
  await assert.doesNotReject(app.api.hideNativeSplash());
  app.timers[0].callback();
  await Promise.resolve();
  assert.equal(calls, 2);
  assert.equal(app.warnings.length, 1);
  const rejected = startup('android', { hideAsync: () => Promise.reject(new Error('native failure')) });
  await assert.doesNotReject(rejected.api.hideNativeSplash());
  assert.equal(rejected.warnings.length, 1);
});

test('web startup never calls native splash APIs or starts a native watchdog', async () => {
  const app = startup('web');
  app.api.beginStartup();
  await app.api.hideNativeSplash();
  assert.equal(app.held(), 0);
  assert.equal(app.hidden(), 0);
  assert.equal(app.timers.length, 0);
});

test('error fallback is independent of providers and releases splash on catch and layout', () => {
  let hidden = 0;
  const errors = [];
  const { default: Boundary } = load('../components/ErrorBoundary.tsx', {
    'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView', StyleSheet: { create: (styles) => styles } },
    '../utils/startup': { hideNativeSplash: async () => { hidden++; } },
  }, { console: { error: (...args) => errors.push(args) } });
  const boundary = new Boundary({ children: 'application' });
  assert.equal(boundary.render(), 'application');
  boundary.state = Boundary.getDerivedStateFromError(new Error('first render failed'));
  boundary.componentDidCatch(new Error('first render failed'), { componentStack: 'Application' });
  const screen = boundary.render();
  assert.equal(screen.props.testID, 'app-error-screen');
  assert.equal(screen.props.children[0].props.children, 'Bir sorun oluştu');
  assert.match(screen.props.children[3].props.children.props.children, /first render failed/);
  screen.props.onLayout();
  assert.equal(hidden, 2);
  assert.equal(errors.length, 1);
  let nextState;
  boundary.setState = (state) => { nextState = state; };
  screen.props.children[2].props.onPress();
  assert.equal(nextState.hasError, false);
  assert.equal(nextState.error, null);
});
