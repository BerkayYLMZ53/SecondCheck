/* global __dirname */
const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const createLoader = require('./helpers/loadTypeScript.cjs');
const apiPath = path.resolve(__dirname, '../api/parse-listing.ts');
const serverPath = path.resolve(__dirname, '../server/listingMetadata.ts');
const page = `<html><head>
  <meta content='iPhone 13 Pro Max &amp; kutulu' PROPERTY='og:title'>
  <meta property="og:description" content="256GB, pil %85, fiyat &gt; 25.000 TL">
  <meta content='/images/phone.jpg?a=1&amp;b=2' property='og:image'>
  <meta property=og:price:amount content=25000.00>
</head></html>`;
const html = (body = page, status = 200, headers = {}) => new Response(body, {
  status, headers: { 'content-type': 'text/html; charset=utf-8', ...headers },
});
const request = (body, method = 'POST') => new Request('https://secondcheck.example/api/parse-listing', {
  method, ...(method === 'POST' ? { body: typeof body === 'string' ? body : JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {}),
});

test('POST fetches social metadata with requested User-Agent and returns typed JSON', async () => {
  const load = createLoader({ fetch: async (url, options) => {
    assert.equal(url, 'https://www.sahibinden.com/ilan/test');
    assert.equal(options.method, 'GET');
    assert.equal(options.headers['User-Agent'], 'Twitterbot/1.0');
    assert.equal(options.redirect, 'manual');
    return html();
  } });
  const response = await load(apiPath).default.fetch(request({ url: 'https://www.sahibinden.com/ilan/test' }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), {
    success: true, title: 'iPhone 13 Pro Max & kutulu',
    description: '256GB, pil %85, fiyat > 25.000 TL',
    image: 'https://www.sahibinden.com/images/phone.jpg?a=1&b=2', rawPrice: '25000.00',
  });
});

test('metadata supports numeric entities, fallback tags, missing image and product price', () => {
  const { extractListingMetadata } = createLoader()(serverPath);
  const result = extractListingMetadata(`<title>Sat&#305;l&#305;k &#x1F4F1;</title>
    <meta name=description content='Temiz cihaz'>
    <meta property='product:price:amount' content='28500'>`, 'https://dolap.com/urun/1');
  assert.equal(result.title, 'Satılık 📱');
  assert.equal(result.description, 'Temiz cihaz');
  assert.equal(result.rawPrice, '28500');
  assert.equal(result.image, null);
});

test('metadata ignores script/comment decoys and unsafe image protocols', () => {
  const { extractListingMetadata } = createLoader()(serverPath);
  const result = extractListingMetadata(`<!-- <meta property=og:title content=wrong> -->
    <script>const template = '<meta property=og:title content=wrong>';</script>
    <meta property='og:title' content='Doğru ilan'>
    <meta property='og:image' content='javascript:alert(1)'>`, 'https://letgo.com/item/1');
  assert.equal(result.title, 'Doğru ilan');
  assert.equal(result.image, null);
});

test('unsupported methods and invalid request bodies return structured errors', async () => {
  const api = createLoader({ fetch: () => assert.fail('must not fetch') })(apiPath).default;
  const method = await api.fetch(request(undefined, 'GET'));
  assert.equal(method.status, 405);
  assert.equal(method.headers.get('allow'), 'POST');
  for (const body of ['{bad', null, [], {}, { url: 123 }, { url: '' }]) {
    const response = await api.fetch(request(body));
    assert.equal(response.status, 400);
    assert.equal((await response.json()).success, false);
  }
});

test('URL validation rejects local hosts, deceptive hosts, credentials and other protocols', async () => {
  const api = createLoader({ fetch: () => assert.fail('must not fetch') })(apiPath).default;
  for (const url of [
    'metin ilan başlığı', 'file:///etc/passwd', 'ftp://sahibinden.com/a',
    'http://127.0.0.1', 'http://169.254.169.254/latest/meta-data',
    'http://[::1]', 'http://localhost', 'https://sahibinden.com.attacker.example/a',
    'https://sahibinden.com@localhost/a', 'https://user:pass@sahibinden.com/a',
    'https://sahibinden.com:8080/a',
  ]) {
    const response = await api.fetch(request({ url }));
    assert.equal(response.status, 400, url);
    assert.equal((await response.json()).success, false);
  }
});

test('allowed marketplace redirects are followed, private redirects are blocked', async () => {
  let calls = 0;
  const load = createLoader({ fetch: async () => {
    calls++;
    return calls === 1 ? new Response(null, { status: 302, headers: { location: 'https://www.sahibinden.com/ilan/final' } }) : html();
  } });
  const response = await load(apiPath).default.fetch(request({ url: 'https://shbd.io/s/abc' }));
  assert.equal(response.status, 200);
  assert.equal(calls, 2);
  calls = 0;
  const blocked = createLoader({ fetch: async () => {
    calls++;
    return new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/secret' } });
  } })(apiPath).default;
  const invalid = await blocked.fetch(request({ url: 'https://dolap.com/urun/a' }));
  assert.equal(invalid.status, 400);
  assert.equal(calls, 1);
});

test('redirect loops and invalid redirect locations fail gracefully', async () => {
  for (const location of ['/loop', 'http://[invalid']) {
    let calls = 0;
    const api = createLoader({ fetch: async () => {
      calls++;
      return new Response(null, { status: 302, headers: { location } });
    } })(apiPath).default;
    const response = await api.fetch(request({ url: 'https://letgo.com/item/1' }));
    assert.equal(response.status, 502);
    assert.ok(calls <= 4);
    assert.equal((await response.json()).success, false);
  }
});

test('blocked responses, non-HTML responses and network errors return fallback messages', async () => {
  for (const fetch of [
    async () => html('Forbidden', 403),
    async () => new Response('{}', { headers: { 'content-type': 'application/json' } }),
    async () => { throw new Error('private upstream detail'); },
  ]) {
    const api = createLoader({ fetch })(apiPath).default;
    const response = await api.fetch(request({ url: 'https://dolap.com/urun/1' }));
    assert.equal(response.status, 502);
    const body = await response.json();
    assert.equal(body.code, 'FETCH_FAILED');
    assert.match(body.error, /metnini yapıştır/);
    assert.ok(!body.error.includes('private upstream detail'));
  }
});

test('missing metadata and challenge pages are not reported as successful listings', async () => {
  for (const content of ['<html>empty</html>', '<title>Just a moment...</title>']) {
    const api = createLoader({ fetch: async () => html(content) })(apiPath).default;
    const response = await api.fetch(request({ url: 'https://letgo.com/item/1' }));
    assert.equal(response.status, 422);
    assert.equal((await response.json()).code, 'NO_METADATA');
  }
});

test('oversized request and page payloads are bounded with or without length headers', async () => {
  const api = createLoader({ fetch: () => assert.fail('must not fetch') })(apiPath).default;
  assert.equal((await api.fetch(request({ url: 'x'.repeat(5000) }))).status, 413);
  for (const response of [
    html('', 200, { 'content-length': '99999999' }),
    html('a'.repeat(2 * 1024 * 1024 + 1)),
  ]) {
    const handler = createLoader({ fetch: async () => response })(apiPath).default;
    const result = await handler.fetch(request({ url: 'https://dolap.com/urun/1' }));
    assert.equal(result.status, 413);
    assert.equal((await result.json()).code, 'PAGE_TOO_LARGE');
  }
});

test('upstream timeouts become 504 without waiting for a real timeout', async () => {
  const api = createLoader({
    setTimeout: (callback) => { queueMicrotask(callback); return 0; },
    clearTimeout: () => {},
    fetch: async (_, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    }),
  })(apiPath).default;
  const response = await api.fetch(request({ url: 'https://letgo.com/item/1' }));
  assert.equal(response.status, 504);
  assert.equal((await response.json()).code, 'TIMEOUT');
});
