import { mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { runPlan } from '../src/plan.mjs';
import { jpeg, png, response } from './helpers.mjs';

const BASE = 'https://cdn.example.test/p/';

async function makeRepo(data) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'img-plan-'));
  const app = path.join(root, 'src', 'app');
  await mkdir(app, { recursive: true });
  await writeFile(path.join(app, 'data.json'), JSON.stringify({ imageBaseUrl: `${BASE}index/`, items: data.map((image) => ({ image })) }));
  return { root, app, out: path.join(root, 'out') };
}

const fetchFrom = (map) =>
  vi.fn(async (url) => {
    const hit = map[url.replace(`${BASE}index/`, '')];
    return hit ?? response(404);
  });

describe('runPlan', () => {
  it('processes, records every status and writes out/ and the manifest', async () => {
    const same = await png(800, 400);
    const { root, app, out } = await makeRepo(['a.png', 'dup.png', 'gone.png', 'bad.png', 'vector.svg', 'weird.png', 'flaky.png', 'local.png']);
    const empty = await mkdtemp(path.join(os.tmpdir(), 'img-empty-'));
    const local = await mkdtemp(path.join(os.tmpdir(), 'img-local-'));
    await mkdir(path.join(local, 'index'), { recursive: true });
    await writeFile(path.join(local, 'index', 'local.png'), await jpeg(900, 450));
    const fetchImpl = fetchFrom({
      'a.png': response(200, { body: same }),
      'dup.png': response(200, { body: same }),
      'gone.png': response(403),
      'bad.png': response(200, { body: (await png(50, 50)).subarray(0, 40) }),
      
      'weird.png': response(200, { body: Buffer.from('not an image at all') }),
      'flaky.png': response(500),
    });
    const log = vi.fn();
    const manifest = await runPlan({
      appDir: app,
      repoRoot: root,
      outDir: out,
      localSources: [empty, local],
      fetchImpl,
      sleep: async () => {},
      random: () => 0,
      log,
      now: () => new Date('2026-11-07T00:00:00Z'),
    });

    expect(manifest.generatedAt).toBe('2026-11-07T00:00:00.000Z');
    expect(manifest.summary).toMatchObject({ found: 8, processed: 3, uniqueImages: 2, unavailable: 1, unsupported: 1, skippedSvg: 1, failed: 2 });
    expect(manifest.summary.bytesIn).toBeGreaterThan(0);
    expect(manifest.summary.bytesOut).toBeGreaterThan(0);

    const byKey = Object.fromEntries(manifest.images.map((i) => [i.key.split('/').pop(), i]));
    expect(byKey['gone.png']).toMatchObject({ status: 'unavailable', httpStatus: 403, sources: ['src/app/data.json'] });
    expect(byKey['vector.svg'].status).toBe('skipped-svg');
    expect(byKey['weird.png'].status).toBe('unsupported');
    expect(byKey['bad.png'].status).toBe('failed');
    expect(byKey['flaky.png']).toMatchObject({ status: 'failed' });
    expect(byKey['flaky.png'].reason).toMatch(/HTTP 500/);
    expect(byKey['local.png'].via).toBe('local');
    expect(byKey['a.png'].via).toBe('download');
    expect(byKey['a.png'].ref.id).toBe(byKey['dup.png'].ref.id);
    expect(byKey['a.png'].profile).toBe('tile');

    const { id, widths } = byKey['a.png'].ref;
    expect(widths).toEqual([449, 800]);
    for (const w of widths) expect((await readFile(path.join(out, id, `${w}.webp`))).length).toBeGreaterThan(0);
    expect((await readdir(path.join(out, 'originals'))).sort()).toHaveLength(2);
    const onDisk = JSON.parse(await readFile(path.join(out, 'manifest.json'), 'utf8'));
    expect(onDisk.summary).toEqual(manifest.summary);
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/^\[8\/8\]/));
  });

  it('limits concurrency to 4', async () => {
    const names = Array.from({ length: 10 }, (_, i) => `n${i}.png`);
    const { root, app, out } = await makeRepo(names);
    let active = 0;
    let peak = 0;
    const body = await png(30, 30);
    const fetchImpl = vi.fn(async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 10));
      active -= 1;
      return response(200, { body });
    });
    await runPlan({ appDir: app, repoRoot: root, outDir: out, concurrency: 99, fetchImpl });
    expect(peak).toBeLessThanOrEqual(4);
    expect(peak).toBeGreaterThan(1);
  });

  it('rethrows a non-image error such as an unwritable output folder', async () => {
    const { root, app } = await makeRepo(['a.png']);
    const blocker = path.join(root, 'file');
    await writeFile(blocker, 'x');
    const fetchImpl = fetchFrom({ 'a.png': response(200, { body: await png(30, 30) }) });
    await expect(runPlan({ appDir: app, repoRoot: root, outDir: blocker, fetchImpl })).rejects.toThrow();
  });
});
