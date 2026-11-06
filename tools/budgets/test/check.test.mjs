import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MAX_IMAGE_BYTES, checkDist, main } from '../src/check.mjs';

let dist;
beforeEach(() => {
  dist = mkdtempSync(join(tmpdir(), 'hft-budgets-'));
});
afterEach(() => rmSync(dist, { recursive: true, force: true }));

const put = (rel, content) => {
  const file = join(dist, rel);
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, content);
};
const io = () => {
  const out = [];
  const err = [];
  return { io: { out: (s) => out.push(s), err: (s) => err.push(s) }, out, err };
};

describe('checkDist', () => {
  it('passes a clean build', async () => {
    put('index.html', '<h1>hello</h1>');
    put('img/a.webp', Buffer.alloc(MAX_IMAGE_BYTES));
    put('notes.bin', 'amazonaws.com but not a scanned type');
    expect(await checkDist(dist)).toEqual({ files: 3, violations: [] });
  });

  it('flags images over the limit, at any depth', async () => {
    put('a/b/big.png', Buffer.alloc(MAX_IMAGE_BYTES + 1));
    const { violations } = await checkDist(dist);
    expect(violations).toEqual([
      { file: 'a/b/big.png', rule: 'image-size', detail: `${MAX_IMAGE_BYTES + 1} bytes exceeds ${MAX_IMAGE_BYTES}` },
    ]);
  });

  it('flags amazonaws.com and CDN hosts case-insensitively without echoing content', async () => {
    put('index.html', '<img src="https://bucket.S3.af-south-1.AmazonAWS.com/x.png">');
    put('main-ABCD1234.js', 'fetch("https://cdn.jsdelivr.net/npm/x")');
    put('styles.css', '@import url(https://fonts.googleapis.com/css2)');
    const { violations } = await checkDist(dist);
    expect(violations.map((v) => `${v.rule}:${v.file}:${v.detail}`).sort()).toEqual([
      'amazonaws:index.html:amazonaws.com',
      'cdn-host:main-ABCD1234.js:cdn.jsdelivr.net',
      'cdn-host:styles.css:fonts.googleapis.com',
    ]);
    expect(JSON.stringify(violations)).not.toContain('bucket');
  });
});

describe('main', () => {
  it('exits 0 on a clean build', async () => {
    put('index.html', 'ok');
    const t = io();
    expect(await main([dist], t.io)).toBe(0);
    expect(t.out.join('')).toContain('1 files, 0 failures, 0 warnings');
  });

  it('exits 1 and lists violations', async () => {
    put('index.html', 'https://unpkg.com/x');
    const t = io();
    expect(await main([dist], t.io)).toBe(1);
    expect(t.err.join('')).toContain('FAIL cdn-host: index.html (unpkg.com)');
  });

  it('turns warned rules into warnings that do not fail the run', async () => {
    put('index.html', 'https://unpkg.com/x https://b.amazonaws.com/y');
    const t = io();
    expect(await main([dist, '--warn', 'cdn-host,amazonaws'], t.io)).toBe(0);
    expect(t.err.join('')).toContain('WARN cdn-host');
    expect(t.out.join('')).toContain('0 failures, 2 warnings');
    expect(await main(['--warn', 'cdn-host', dist], io().io)).toBe(1);
    expect(await main([dist, '--warn', 'amazonaws'], io().io)).toBe(1);
  });

  it('rejects a bad --warn list', async () => {
    expect(await main([dist, '--warn'], io().io)).toBe(2);
    expect(await main([dist, '--warn', 'nope'], io().io)).toBe(2);
    expect(await main([dist, '--warn', ','], io().io)).toBe(2);
  });

  it('exits 2 on bad usage or an unreadable directory', async () => {
    const a = io();
    expect(await main([], a.io)).toBe(2);
    expect(a.err.join('')).toContain('usage');
    expect(await main(['a', 'b'], io().io)).toBe(2);
    const b = io();
    expect(await main([join(dist, 'missing')], b.io)).toBe(2);
    expect(b.err.join('')).toContain('cannot scan');
  });
});
