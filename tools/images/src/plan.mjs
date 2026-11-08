import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { collectImages, findLocal } from './collect.mjs';
import { DOWNLOAD_CONCURRENCY, download } from './download.mjs';
import { pool } from './pool.mjs';
import { ImageError, processImage } from './process.mjs';

const SOFT_ERRORS = new Set(['HEIC_UNSUPPORTED', 'UNSUPPORTED_FORMAT']);

async function fetchOriginal(entry, { localSources, ...downloadOptions }) {
  for (const dir of localSources) {
    const local = await findLocal(dir, entry.url);
    if (local) return { status: 'ok', buffer: local, via: 'local' };
  }
  return { ...(await download(entry.url, downloadOptions)), via: 'download' };
}

async function writeVariants(outDir, image, original, written) {
  if (written.has(image.id)) return;
  written.add(image.id);
  await mkdir(path.join(outDir, image.id), { recursive: true });
  await mkdir(path.join(outDir, 'originals'), { recursive: true });
  await writeFile(path.join(outDir, 'originals', `${image.id}.${image.ext}`), original);
  for (const variant of image.variants) {
    await writeFile(path.join(outDir, image.id, `${variant.width}.webp`), variant.buffer);
  }
}

async function planOne(entry, options, written) {
  const result = {
    url: entry.url,
    key: new URL(entry.url).pathname.replace(/^\//, ''),
    profile: entry.profile,
    sources: entry.sources,
  };
  if (entry.url.split(/[?#]/)[0].toLowerCase().endsWith('.svg')) {
    return { ...result, status: 'skipped-svg', reason: 'SVG is served as a static file, not through the pipeline' };
  }
  const got = await fetchOriginal(entry, options);
  if (got.status !== 'ok') {
    return got.status === 'unavailable'
      ? { ...result, status: 'unavailable', httpStatus: got.httpStatus }
      : { ...result, status: 'failed', reason: got.reason };
  }
  try {
    const image = await processImage(got.buffer, entry.profile);
    await writeVariants(options.outDir, image, got.buffer, written);
    return {
      ...result,
      status: 'processed',
      via: got.via,
      ext: image.ext,
      ref: { id: image.id, w: image.w, h: image.h, widths: image.widths },
      bytesIn: got.buffer.length,
      bytesOut: image.variants.reduce((sum, v) => sum + v.buffer.length, 0),
    };
  } catch (error) {
    if (!(error instanceof ImageError)) throw error;
    const status = SOFT_ERRORS.has(error.code) ? 'unsupported' : 'failed';
    return { ...result, status, reason: error.message };
  }
}

/**
 * Collect, download, process and write out/ and out/manifest.json. Needs no AWS credentials.
 * Unavailable images (for example HTTP 403) are recorded, not fatal.
 */
export async function runPlan({
  appDir,
  repoRoot,
  outDir,
  localSources = [],
  concurrency = DOWNLOAD_CONCURRENCY,
  fetchImpl,
  sleep,
  random,
  log = () => {},
  now = () => new Date(),
}) {
  const { images, unresolved } = await collectImages(appDir, repoRoot);
  const entries = [...images.values()].sort((a, b) => a.url.localeCompare(b.url));
  const written = new Set();
  const options = { outDir, localSources, fetchImpl, sleep, random, log };
  let done = 0;
  const results = await pool(entries, Math.min(concurrency, DOWNLOAD_CONCURRENCY), async (entry) => {
    const result = await planOne(entry, options, written);
    done += 1;
    log(`[${done}/${entries.length}] ${result.status}`);
    return result;
  });

  const count = (status) => results.filter((r) => r.status === status).length;
  const processed = results.filter((r) => r.status === 'processed');
  const summary = {
    found: results.length,
    processed: processed.length,
    unavailable: count('unavailable'),
    unsupported: count('unsupported'),
    skippedSvg: count('skipped-svg'),
    failed: count('failed'),
    uniqueImages: new Set(processed.map((r) => r.ref.id)).size,
    bytesIn: processed.reduce((sum, r) => sum + r.bytesIn, 0),
    bytesOut: processed.reduce((sum, r) => sum + r.bytesOut, 0),
  };
  const manifest = { generatedAt: now().toISOString(), summary, unresolved, images: results };
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}
