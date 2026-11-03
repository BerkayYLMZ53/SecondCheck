const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

module.exports = function createLoader(globals = {}) {
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
    const module = { exports: {} };
    cache.set(file, module.exports);
    const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText;
    vm.runInNewContext(compiled, {
      module,
      exports: module.exports,
      URL, Request, Response, TextDecoder, AbortController, setTimeout, clearTimeout,
      ...globals,
      require: (name) => load(path.resolve(path.dirname(file), name.endsWith('.json') ? name : `${name}.ts`)),
    }, { filename: file });
    cache.set(file, module.exports);
    return module.exports;
  }
  return load;
};
