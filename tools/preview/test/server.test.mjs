import { EventEmitter } from 'node:events';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { tryFile } from '../src/files.mjs';
import { createPreviewServer, originOk } from '../src/server.mjs';

const SECRET = 'unit-test-secret-value';
const root = mkdtempSync(join(tmpdir(), 'hft-preview-'));
const site = join(root, 'site');
const imgs = join(root, 'imgs');
const empty = join(root, 'empty');
const servers = [];

function put(base, rel, content) {
  const file = join(base, rel);
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, content);
}

beforeAll(() => {
  put(site, 'index.html', '<h1>home</h1>');
  put(site, 'biography.html', '<h1>bio</h1>');
  put(site, 'portfolio/index.html', '<h1>portfolio</h1>');
  put(site, 'portfolio/cv.html', '<h1>cv</h1>');
  put(site, '404.html', '<h1>styled 404</h1>');
  put(site, 'main-ABCD1234.js', 'console.log(1)');
  put(site, 'version.json', '{}');
  put(imgs, 'abcdef0123456789/480.webp', 'webp-bytes');
  put(root, 'secret.txt', 'outside');
  mkdirSync(empty, { recursive: true });
});

afterAll(async () => {
  await Promise.all(servers.map((s) => new Promise((r) => s.close(r))));
  rmSync(root, { recursive: true, force: true });
});

async function start(over = {}, deps = {}) {
  const cfg = { dir: site, mode: 'v1', originSecret: '', cspReportOnly: false, cspEnforce: false, edgeHeaders: false, ...over };
  const server = createPreviewServer(cfg, deps);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  servers.push(server);
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = (path, init = {}) => fetch(base + path, { redirect: 'manual', ...init });
  return { base, get, server };
}

describe('site serving', () => {
  it('serves the home page with HTML cache headers and an ETag', async () => {
    const { get } = await start();
    const res = await get('/');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('<h1>home</h1>');
    expect(res.headers.get('cache-control')).toBe('no-cache, stale-if-error=86400');
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(res.headers.get('etag')).toMatch(/^W\//);
    expect(res.headers.get('last-modified')).toBeTruthy();
  });

  it('answers conditional requests with 304', async () => {
    const { get } = await start();
    const etag = (await get('/')).headers.get('etag');
    expect((await get('/', { headers: { 'if-none-match': etag } })).status).toBe(304);
    expect((await get('/', { headers: { 'if-none-match': `"x", ${etag}` } })).status).toBe(304);
    expect((await get('/', { headers: { 'if-none-match': '"other"' } })).status).toBe(200);
  });

  it('supports HEAD without a body', async () => {
    const { get } = await start();
    const res = await get('/biography', { method: 'HEAD' });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-length')).toBe(String('<h1>bio</h1>'.length));
    expect(await res.text()).toBe('');
  });

  it('resolves clean URLs: $uri.html and $uri/index.html', async () => {
    const { get } = await start();
    expect(await (await get('/biography')).text()).toBe('<h1>bio</h1>');
    expect(await (await get('/portfolio')).text()).toBe('<h1>portfolio</h1>');
    expect(await (await get('/portfolio/cv')).text()).toBe('<h1>cv</h1>');
  });

  it('serves a direct 404.html file as 200 (no redirect)', async () => {
    const { get } = await start();
    expect((await get('/404.html')).status).toBe(200);
  });

  it('gives hashed assets the immutable header and other files no-cache', async () => {
    const { get } = await start();
    const hashed = await get('/main-ABCD1234.js');
    expect(hashed.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(hashed.headers.get('content-type')).toContain('javascript');
    expect((await get('/version.json')).headers.get('cache-control')).toBe('no-cache');
  });

  it('301s trailing slashes, .html and legacy /pages/ links, keeping the query', async () => {
    const { get } = await start();
    for (const [from, to] of [
      ['/portfolio/', '/portfolio'],
      ['/biography.html', '/biography'],
      ['/pages/portfolio/cv.html', '/portfolio/cv'],
      ['/portfolio/?a=1&b=2', '/portfolio?a=1&b=2'],
    ]) {
      const res = await get(from);
      expect(res.status).toBe(301);
      expect(res.headers.get('location')).toBe(to);
    }
  });

  it('never redirects to another host, even for protocol-relative paths', async () => {
    const { get } = await start();
    const res = await get('//evil.example/x/');
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe('/evil.example/x');
  });

  it('returns the styled 404 with status 404', async () => {
    const { get } = await start();
    const res = await get('/nope');
    expect(res.status).toBe(404);
    expect(await res.text()).toBe('<h1>styled 404</h1>');
    expect(res.headers.get('cache-control')).toBe('no-cache, stale-if-error=86400');
  });

  it('returns a plain 404 when there is no 404.html', async () => {
    const { get } = await start({ dir: empty });
    const res = await get('/nope');
    expect(res.status).toBe(404);
    expect(await res.text()).toBe('404 Not Found');
  });

  it('rejects other methods and unsafe paths', async () => {
    const { get } = await start();
    const post = await get('/', { method: 'POST' });
    expect(post.status).toBe(405);
    expect(post.headers.get('allow')).toBe('GET, HEAD');
    expect((await get('/%zz')).status).toBe(400);
    expect((await get('/%2e%2e%2fsecret.txt')).status).toBe(400);
    expect((await get('/a%5Cb')).status).toBe(400);
    expect((await get('/%00')).status).toBe(400);
  });

  it('returns 500 when the site directory is missing', async () => {
    const { get } = await start({ dir: join(root, 'does-not-exist') });
    expect((await get('/')).status).toBe(500);
  });

  it('destroys the response when a failure happens after headers were sent', async () => {
    const server = createPreviewServer({ dir: site, mode: 'v1', originSecret: '' });
    const res = Object.assign(new EventEmitter(), {
      headersSent: true,
      statusCode: 200,
      destroy: vi.fn(),
      writeHead: () => {
        throw new Error('boom');
      },
    });
    server.emit('request', { method: 'GET', url: '/', headers: {} }, res);
    await vi.waitFor(() => expect(res.destroy).toHaveBeenCalled());
  });

  it('logs the request line without headers or query strings', async () => {
    const lines = [];
    const { get } = await start({ mode: 'v1', originSecret: SECRET }, { log: (l) => lines.push(l) });
    await get('/biography?token=abc', { headers: { 'x-origin-verify': SECRET } });
    await get('/biography');
    await vi.waitFor(() => expect(lines).toHaveLength(2));
    expect(lines[0]).toBe('GET /biography 200 origin_ok=1');
    expect(lines[1]).toBe('GET /biography 200 origin_ok=0');
    expect(lines.join('\n')).not.toContain(SECRET);
    expect(lines.join('\n')).not.toContain('token');
  });
});

describe('headers', () => {
  it('adds the CloudFront response-header-policy headers on request', async () => {
    const { get } = await start({ edgeHeaders: true });
    const res = await get('/');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN');
    expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(res.headers.get('permissions-policy')).toBe('camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=(), browsing-topics=()');
    expect((await (await start()).get('/')).headers.get('x-frame-options')).toBeNull();
  });

  it('sends the enforced CSP only when asked, without script-src or default-src', async () => {
    const { get } = await start({ cspEnforce: true });
    const csp = (await get('/')).headers.get('content-security-policy');
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("img-src 'self' data:");
    expect(csp).not.toContain('upgrade-insecure-requests');
    expect(csp).not.toContain('script-src');
    expect(csp).not.toContain('default-src');
    expect(csp).not.toContain('report-uri');
    expect((await (await start()).get('/')).headers.get('content-security-policy')).toBeNull();
  });

  it('sends the report-only CSP only when asked', async () => {
    const { get } = await start({ cspReportOnly: true });
    const csp = (await get('/')).headers.get('content-security-policy-report-only');
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain('report-uri /__csp-report');
    expect(csp).not.toContain('script-src');
    expect((await (await start()).get('/')).headers.get('content-security-policy-report-only')).toBeNull();
  });
});

describe('origin header (v1 log-only, v2 enforced)', () => {
  it('v1 never blocks', async () => {
    const { get } = await start({ mode: 'v1', originSecret: SECRET });
    expect((await get('/')).status).toBe(200);
  });
  it('v2 blocks a missing or wrong header and allows the right one', async () => {
    const { get } = await start({ mode: 'v2', originSecret: SECRET });
    expect((await get('/')).status).toBe(403);
    expect((await get('/', { headers: { 'x-origin-verify': 'wrong' } })).status).toBe(403);
    expect((await get('/', { headers: { 'x-origin-verify': SECRET } })).status).toBe(200);
  });
  it('originOk accepts everything when no secret is set', () => {
    expect(originOk(undefined, '')).toBe(true);
    expect(originOk(undefined, SECRET)).toBe(false);
    expect(originOk(SECRET, SECRET)).toBe(true);
  });
});

describe('csp report collection', () => {
  const post = (base, body) =>
    fetch(`${base}/__csp-report`, { method: 'POST', headers: { 'content-type': 'application/csp-report' }, body });

  it('stores legacy and modern reports and lists them', async () => {
    const { base, get } = await start({ cspReportOnly: true });
    expect((await post(base, JSON.stringify({ 'csp-report': { 'violated-directive': 'img-src', 'blocked-uri': 'https://x.test', 'document-uri': base } }))).status).toBe(204);
    expect((await post(base, JSON.stringify({ effectiveDirective: 'font-src', blockedURL: 'inline', documentURL: base }))).status).toBe(204);
    expect((await post(base, JSON.stringify({}))).status).toBe(204);
    const list = await (await get('/__csp-reports')).json();
    expect(list.count).toBe(3);
    expect(list.reports[0]).toEqual({ directive: 'img-src', blocked: 'https://x.test', document: base });
    expect(list.reports[1].directive).toBe('font-src');
    expect(list.reports[2]).toEqual({ directive: '', blocked: '', document: '' });
  });

  it('rejects bad JSON and oversize bodies, and caps the stored reports', async () => {
    const { base, get } = await start({ cspReportOnly: true });
    expect((await post(base, 'not json')).status).toBe(400);
    const big = await post(base, 'x'.repeat(40_000)).catch(() => ({ status: 0 }));
    expect([0, 400]).toContain(big.status);
    for (let i = 0; i < 205; i++) await post(base, '{}');
    expect((await (await get('/__csp-reports')).json()).count).toBe(200);
  });

  it('does not expose the endpoints, or accept POST, when disabled', async () => {
    const { get } = await start();
    expect((await get('/__csp-reports')).status).toBe(404);
    expect((await get('/__csp-report', { method: 'POST', body: '{}' })).status).toBe(405);
  });

  it('refuses POST to other paths and unknown methods on the report path', async () => {
    const { get } = await start({ cspReportOnly: true });
    expect((await get('/', { method: 'POST', body: '{}' })).status).toBe(405);
    expect((await get('/__csp-report')).status).toBe(404);
  });
});

describe('images', () => {
  it('serves /img/ from a local directory as immutable', async () => {
    const { get } = await start({ imgDir: imgs });
    const res = await get('/img/abcdef0123456789/480.webp');
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(await res.text()).toBe('webp-bytes');
    expect((await get('/img/abcdef0123456789/960.webp')).status).toBe(404);
  });

  it('proxies /img/ to the configured https origin', async () => {
    const fetchImpl = vi.fn(async () => new Response(Buffer.from('proxied'), { status: 200 }));
    const { get } = await start({ imgOrigin: 'https://images.example' }, { fetchImpl });
    const res = await get('/img/abcdef0123456789/480.webp');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/webp');
    expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(await res.text()).toBe('proxied');
    expect(fetchImpl.mock.calls[0][0]).toBe('https://images.example/img/abcdef0123456789/480.webp');
    const head = await get('/img/abcdef0123456789/480.webp', { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');
  });

  it('only proxies well-formed image paths', async () => {
    const fetchImpl = vi.fn();
    const { get } = await start({ imgOrigin: 'https://images.example' }, { fetchImpl });
    expect((await get('/img/%2e%2e%2fx')).status).toBe(400);
    expect((await get('/img/notanid/480.webp')).status).toBe(404);
    expect((await get('/img/abcdef0123456789/480.png')).status).toBe(404);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('maps upstream failures to 404 and 502', async () => {
    const down = await start({ imgOrigin: 'https://images.example' }, { fetchImpl: async () => new Response('', { status: 503 }) });
    expect((await down.get('/img/abcdef0123456789/480.webp')).status).toBe(404);
    const broken = await start(
      { imgOrigin: 'https://images.example' },
      { fetchImpl: async () => { throw new Error('network'); } },
    );
    expect((await broken.get('/img/abcdef0123456789/480.webp')).status).toBe(502);
  });

  it('uses the real fetch by default and 404s with no image source configured', async () => {
    const { get } = await start();
    expect((await get('/img/abcdef0123456789/480.webp')).status).toBe(404);
  });
});

describe('tryFile', () => {
  it('refuses files outside the root and directories', async () => {
    const { realpath } = await import('node:fs/promises');
    const real = await realpath(site);
    expect(await tryFile(real, '../secret.txt')).toBeNull();
    expect(await tryFile(real, '/portfolio')).toBeNull();
    expect(await tryFile(real, '/missing.html')).toBeNull();
    expect((await tryFile(real, '/biography.html')).file.endsWith('biography.html')).toBe(true);
    expect(await tryFile(real, '/')).toBeNull();
  });
});
