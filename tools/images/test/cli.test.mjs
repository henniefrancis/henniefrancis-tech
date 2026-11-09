import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { S3Client } from '@aws-sdk/client-s3';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_DIR, main, makeS3Client } from '../src/cli.mjs';
import { png, response } from './helpers.mjs';

const BASE = 'https://cdn.example.test/p/';

async function makeRepo(appDir, images) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'img-cli-'));
  const app = path.join(root, appDir);
  await mkdir(app, { recursive: true });
  await writeFile(path.join(app, 'd.json'), JSON.stringify({ imageBaseUrl: `${BASE}x/`, items: images.map((image) => ({ image })) }));
  return { root, out: path.join(root, 'out') };
}

const io = () => {
  const lines = [];
  const errors = [];
  return { lines, errors, log: (l) => lines.push(l), errorLog: (l) => errors.push(l) };
};

async function planned() {
  const { root, out } = await makeRepo('src/app', ['a.png']);
  const body = await png(300, 300);
  const base = io();
  await main(['--plan', '--repo-root', root, '--out', out], { ...base, fetchImpl: async () => response(200, { body }) });
  return { root, out };
}


afterEach(() => vi.restoreAllMocks());

describe('main: general', () => {
  it('prints usage for --help using console.log', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(await main(['--help'])).toBe(0);
    expect(spy.mock.calls[0][0]).toContain('Usage:');
  });

  it('exits 2 with usage when no mode is chosen, using console.error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await main([])).toBe(2);
    expect(spy.mock.calls[0][0]).toMatch(/exactly one of/);
  });

  it('exits 2 when both modes are chosen or an option is unknown', async () => {
    const t = io();
    expect(await main(['--plan', '--upload'], t)).toBe(2);
    expect(await main(['--nope'], t)).toBe(2);
    expect(t.errors.join('\n')).toMatch(/exactly one of/);
  });

  it('builds the default S3 client when none is injected', async () => {
    const { out } = await planned();
    const send = vi.spyOn(S3Client.prototype, 'send').mockResolvedValue({});
    const t = io();
    expect(await main(['--upload', '--out', out], { ...t, env: { IMAGE_BUCKET: 'bkt-1', AWS_REGION: 'af-south-1' } })).toBe(0);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('reports a thrown plain string', async () => {
    const { out } = await planned();
    const t = io();
    const makeClient = () => {
      throw 'plain failure';
    };
    expect(await main(['--upload', '--out', out], { ...t, env: { IMAGE_BUCKET: 'bkt-1' }, makeClient })).toBe(2);
    expect(t.errors[0]).toBe('error: plain failure');
  });
});

describe('makeS3Client', () => {
  it('builds a client in the given or default region', async () => {
    const withRegion = makeS3Client({ AWS_REGION: 'eu-west-1' });
    expect(withRegion).toBeInstanceOf(S3Client);
    expect(await withRegion.config.region()).toBe('eu-west-1');
    expect(await makeS3Client({}).config.region()).toBe('af-south-1');
    expect(makeS3Client()).toBeInstanceOf(S3Client);
  });
});

describe('main: --plan', () => {
  it('uses the default app folder and the default out folder, then reports counts', async () => {
    expect(DEFAULT_APP_DIR).toBe('src/app');
    const { root, out } = await makeRepo('src/app', ['a.png', 'gone.png', 'b.svg']);
    const body = await png(300, 300);
    const fetchImpl = async (url) => (url.endsWith('a.png') ? response(200, { body }) : url.endsWith('gone.png') ? response(403) : response(200, { body: Buffer.from('<svg/>') }));
    const t = io();
    const code = await main(['--plan'], { ...t, fetchImpl, defaultRepoRoot: root, defaultOut: out });
    expect(code).toBe(0);
    expect(t.lines.join('\n')).toMatch(/found 3, processed 1 \(1 unique\), unavailable 1, unsupported 0, skipped-svg 1, failed 0/);
    expect(t.lines.join('\n')).toMatch(/size before .* MB, after .* MB/);
    expect(t.lines.join('\n')).toMatch(/unavailable: .*gone\.png \(403\)/);
  });

  it('honours --app-dir, --repo-root, --out, --local-source and --concurrency, and lists unresolved references', async () => {
    const { root, out } = await makeRepo('custom/app', ['a.png']);
    await writeFile(path.join(root, 'custom', 'app', 'e.json'), '{ "items": [{ "image": "lost.png" }] }');
    const local = await mkdtemp(path.join(os.tmpdir(), 'img-cli-local-'));
    await writeFile(path.join(local, 'a.png'), await png(300, 300));
    const fetchImpl = vi.fn();
    const t = io();
    const code = await main(
      ['--plan', '--app-dir', 'custom/app', '--repo-root', root, '--out', out, '--local-source', local, '--concurrency', '2'],
      { ...t, fetchImpl },
    );
    expect(code).toBe(0);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(t.lines.join('\n')).toMatch(/unresolved reference "lost\.png" in custom\/app\/e\.json/);
  });

  it('exits 1 when an image failed', async () => {
    const { root, out } = await makeRepo('src/app', ['a.png']);
    const t = io();
    const code = await main(['--plan', '--repo-root', root, '--out', out], {
      ...t,
      fetchImpl: async () => response(500),
      sleep: async () => {},
      random: () => 0,
    });
    expect(code).toBe(1);
    expect(t.lines.join('\n')).toMatch(/failed: .*a\.png \(HTTP 500/);
  });

  it.each(['0', '5', 'x', '1.5'])('rejects --concurrency %s', async (value) => {
    const t = io();
    expect(await main(['--plan', '--concurrency', value], t)).toBe(2);
    expect(t.errors[0]).toMatch(/--concurrency/);
  });
});

describe('main: --upload', () => {
  it('needs IMAGE_BUCKET', async () => {
    const t = io();
    expect(await main(['--upload'], { ...t, env: {} })).toBe(2);
    expect(t.errors[0]).toMatch(/IMAGE_BUCKET is not set/);
  });

  it('refuses a manifest with nothing processed', async () => {
    const { root, out } = await makeRepo('src/app', ['a.png']);
    const t = io();
    await main(['--plan', '--repo-root', root, '--out', out], { ...t, fetchImpl: async () => response(403) });
    const u = io();
    expect(await main(['--upload', '--out', out], { ...u, env: { IMAGE_BUCKET: 'bkt-1' } })).toBe(2);
    expect(u.errors[0]).toMatch(/no processed images/);
  });

  it('dry run sends nothing', async () => {
    const { out } = await planned();
    const makeClient = vi.fn();
    const t = io();
    expect(await main(['--upload', '--dry-run'], { ...t, env: { IMAGE_BUCKET: 'bkt-1' }, defaultOut: out, makeClient })).toBe(0);
    expect(makeClient).not.toHaveBeenCalled();
    expect(t.lines[0]).toMatch(/dry run: 1 images/);
  });

  it('uploads with the mocked client and never prints the bucket name', async () => {
    const { out } = await planned();
    const client = { send: vi.fn(async () => ({})) };
    const t = io();
    expect(await main(['--upload', '--out', out], { ...t, env: { IMAGE_BUCKET: 'secret-bucket-name' }, makeClient: () => client })).toBe(0);
    expect(client.send).toHaveBeenCalledTimes(2);
    expect(t.lines.join('\n')).toMatch(/done: 1 images, 2 objects uploaded, 0 already present/);
    expect(t.lines.join('\n')).not.toContain('secret-bucket-name');
  });
});
