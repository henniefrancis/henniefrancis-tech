import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { checkOne, collectRefPaths, parseBaseUrl, runVerify, verifyMain } from '../src/verify.mjs';
import { response } from './helpers.mjs';

const GOOD = { 'cache-control': 'public, max-age=31536000, immutable', 'content-type': 'image/webp' };
const ID = '0123456789abcdef';
const ORIGIN = 'https://site.example.test';

async function makeRepo() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'img-verify-'));
  const app = path.join(root, 'src', 'app');
  await mkdir(path.join(app, 'sub'), { recursive: true });
  await writeFile(path.join(app, 'a.json'), `{ "image": { "id": "${ID}", "w": 960, "h": 480, "widths": [480, 960] } }`);
  await writeFile(
    path.join(app, 'sub', 'b.ts'),
    `export const X = { image: { id: 'fedcba9876543210', w: 100, h: 50, widths: [100] } };\nconst dup = { id: '${ID}', w: 960, h: 480, widths: [480, 960] };`,
  );
  await writeFile(path.join(app, 'sub', 'c.spec.ts'), `const z = { id: 'aaaaaaaaaaaaaaaa', w: 1, h: 1, widths: [1] };`);
  await writeFile(path.join(app, 'sub', 'notes.txt'), `{ id: 'bbbbbbbbbbbbbbbb', w: 1, h: 1, widths: [1] }`);
  return { root, app };
}

describe('collectRefPaths', () => {
  it('finds refs in JSON and TypeScript, once each, and skips specs and other files', async () => {
    const { app } = await makeRepo();
    expect(await collectRefPaths(app)).toEqual([
      `/img/${ID}/480.webp`,
      `/img/${ID}/960.webp`,
      '/img/fedcba9876543210/100.webp',
    ]);
  });
});

describe('parseBaseUrl', () => {
  it('returns the origin for https and for http on localhost', () => {
    expect(parseBaseUrl('https://site.example.test/some/path')).toBe(ORIGIN);
    expect(parseBaseUrl('http://localhost:8080/')).toBe('http://localhost:8080');
    expect(parseBaseUrl('http://127.0.0.1:9000')).toBe('http://127.0.0.1:9000');
  });

  it('rejects junk, plain http elsewhere and other schemes', () => {
    expect(() => parseBaseUrl('not a url')).toThrow(/not a valid URL/);
    expect(() => parseBaseUrl('http://site.example.test')).toThrow(/https/);
    expect(() => parseBaseUrl('ftp://localhost')).toThrow(/https/);
  });
});

describe('checkOne', () => {
  const opts = (fetchImpl) => ({ fetchImpl, sleep: async () => {}, random: () => 0 });

  it('passes a 200 with the immutable cache header and image/webp', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(200, { headers: GOOD }));
    expect(await checkOne(ORIGIN, '/img/x/1.webp', opts(fetchImpl))).toEqual({ path: '/img/x/1.webp', ok: true });
    expect(fetchImpl.mock.calls[0][0]).toBe(`${ORIGIN}/img/x/1.webp`);
    expect(fetchImpl.mock.calls[0][1].method).toBe('HEAD');
  });

  it('flags a missing immutable header, a short max-age and a wrong content type', async () => {
    const none = vi.fn().mockResolvedValue(response(200));
    const result = await checkOne(ORIGIN, '/p', opts(none));
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('cache-control is ""');
    expect(result.reason).toContain('content-type is ""');
    const short = vi.fn().mockResolvedValue(response(200, { headers: { ...GOOD, 'cache-control': 'public, max-age=60, immutable' } }));
    expect((await checkOne(ORIGIN, '/p', opts(short))).reason).toContain('max-age=60');
    const noImmutable = vi.fn().mockResolvedValue(response(200, { headers: { ...GOOD, 'cache-control': 'public, max-age=31536000' } }));
    expect((await checkOne(ORIGIN, '/p', opts(noImmutable))).ok).toBe(false);
  });

  it('fails on 403, 404 and redirects without retrying', async () => {
    for (const status of [403, 404, 301]) {
      const fetchImpl = vi.fn().mockResolvedValue(response(status));
      expect(await checkOne(ORIGIN, '/p', opts(fetchImpl))).toEqual({ path: '/p', ok: false, reason: `HTTP ${status}` });
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    }
  });

  it('retries throttling and then passes', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response(429, { headers: { 'retry-after': '1' } }))
      .mockResolvedValueOnce(response(503))
      .mockResolvedValueOnce(response(200, { headers: GOOD }));
    const sleep = vi.fn(async () => {});
    expect((await checkOne(ORIGIN, '/p', { fetchImpl, sleep, random: () => 0 })).ok).toBe(true);
    expect(sleep).toHaveBeenNthCalledWith(1, 1000);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('gives up after repeated errors', async () => {
    const down = vi.fn().mockResolvedValue(response(500));
    expect((await checkOne(ORIGIN, '/p', opts(down))).reason).toBe('HTTP 500 after 5 attempts');
    const broken = vi.fn().mockRejectedValue(new TypeError('x'));
    expect((await checkOne(ORIGIN, '/p', opts(broken))).reason).toBe('network error: TypeError after 5 attempts');
    const nameless = vi.fn().mockRejectedValue(null);
    expect((await checkOne(ORIGIN, '/p', opts(nameless))).reason).toContain('network error: Error');
  });

  it('uses the global fetch and real sleep by default', async () => {
    const stub = vi
      .fn()
      .mockResolvedValueOnce(response(503, { headers: { 'retry-after': '0' } }))
      .mockResolvedValueOnce(response(200, { headers: GOOD }));
    vi.stubGlobal('fetch', stub);
    try {
      expect((await checkOne(ORIGIN, '/p')).ok).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('runVerify', () => {
  it('reports totals and failures', async () => {
    const { app } = await makeRepo();
    const fetchImpl = vi.fn(async (url) => (url.includes('fedcba') ? response(404) : response(200, { headers: GOOD })));
    const result = await runVerify({ origin: ORIGIN, appDir: app, fetchImpl, sleep: async () => {}, random: () => 0 });
    expect(result.total).toBe(3);
    expect(result.failures).toEqual([{ path: '/img/fedcba9876543210/100.webp', ok: false, reason: 'HTTP 404' }]);
  });
});

describe('verifyMain', () => {
  const io = () => {
    const lines = [];
    const errors = [];
    return { lines, errors, log: (l) => lines.push(l), errorLog: (l) => errors.push(l) };
  };
  const ok = async () => response(200, { headers: GOOD });

  it('prints usage for --help', async () => {
    const t = io();
    expect(await verifyMain(['--help'], t)).toBe(0);
    expect(t.lines[0]).toContain('Usage:');
  });

  it('exits 0 when every URL passes (default app dir, default repo root override)', async () => {
    const { root } = await makeRepo();
    const t = io();
    expect(await verifyMain([ORIGIN], { ...t, defaultRepoRoot: root, fetchImpl: ok })).toBe(0);
    expect(t.lines.at(-1)).toBe('checked 3 image URLs, 0 failed');
  });

  it('checks the real data files of this repo by default', async () => {
    const t = io();
    expect(await verifyMain([ORIGIN], { ...t, fetchImpl: ok })).toBe(0);
    expect(t.lines.at(-1)).toMatch(/^checked [1-9]\d* image URLs, 0 failed$/);
  });

  it('exits 1 and lists failures; honours --repo-root and --app-dir', async () => {
    const { root } = await makeRepo();
    const t = io();
    const code = await verifyMain([ORIGIN, '--repo-root', root, '--app-dir', 'src/app'], {
      ...t,
      fetchImpl: async () => response(404),
    });
    expect(code).toBe(1);
    expect(t.lines[0]).toBe(`FAIL /img/${ID}/480.webp: HTTP 404`);
    expect(t.lines.at(-1)).toBe('checked 3 image URLs, 3 failed');
  });

  it('exits 2 for a bad base URL, a missing argument, an unknown option or no refs', async () => {
    const t = io();
    expect(await verifyMain(['http://site.example.test'], t)).toBe(2);
    expect(await verifyMain([], t)).toBe(2);
    expect(await verifyMain(['--nope'], t)).toBe(2);
    const empty = await mkdtemp(path.join(os.tmpdir(), 'img-verify-empty-'));
    await mkdir(path.join(empty, 'src', 'app'), { recursive: true });
    expect(await verifyMain([ORIGIN, '--repo-root', empty], t)).toBe(2);
    expect(t.errors.join('\n')).toMatch(/No ImageRefs were found/);
  });

  it('uses console by default and reports a thrown plain value', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(await verifyMain(['--help'])).toBe(0);
      expect(await verifyMain([])).toBe(2);
      expect(logSpy).toHaveBeenCalled();
      expect(errSpy).toHaveBeenCalled();
      const t = io();
      const { root } = await makeRepo();
      const fetchImpl = () => {
        throw 'plain';
      };
      expect(await verifyMain([ORIGIN, '--repo-root', root], { ...t, fetchImpl, sleep: async () => {}, random: () => 0 })).toBe(1);
    } finally {
      logSpy.mockRestore();
      errSpy.mockRestore();
    }
  });

  it('reports a non-Error value thrown while running', async () => {
    const t = io();
    const { root } = await makeRepo();
    const code = await verifyMain([ORIGIN, '--repo-root', root], {
      ...t,
      get fetchImpl() {
        throw 'boom';
      },
    });
    expect(code).toBe(2);
    expect(t.errors[0]).toBe('error: boom');
  });
});
