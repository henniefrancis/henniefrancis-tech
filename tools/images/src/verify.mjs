import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import {
  DOWNLOAD_CONCURRENCY,
  MAX_ATTEMPTS,
  REQUEST_TIMEOUT_MS,
  RETRYABLE,
  backoffMs,
  defaultSleep,
  retryAfterMs,
} from './download.mjs';
import { pool } from './pool.mjs';

const DEFAULT_APP_DIR = 'src/app';
const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_REPO_ROOT = path.resolve(packageDir, '..', '..');

// An ImageRef written as JSON or as a TypeScript object literal.
const REF =
  /["']?id["']?\s*:\s*["']([0-9a-f]{16})["']\s*,\s*["']?w["']?\s*:\s*(\d+)\s*,\s*["']?h["']?\s*:\s*(\d+)\s*,\s*["']?widths["']?\s*:\s*\[([\d,\s]+)\]/g;

export const USAGE = `Usage: node verify.mjs <base-url> [--app-dir <dir>] [--repo-root <dir>]

Requests every ImageRef URL (/img/{id}/{width}.webp) of the data files under <base-url>
and expects HTTP 200, "Cache-Control: public, max-age=31536000, immutable" and image/webp.
Run it after the image upload, against the CloudFront site. <base-url> must be https
(plain http is allowed for localhost only).
`;

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

/** Every distinct /img/{id}/{width}.webp path referenced by ImageRefs in the app folder. */
export async function collectRefPaths(appDir) {
  const paths = new Set();
  for await (const file of walk(appDir)) {
    if (!/\.(json|ts|html)$/.test(file) || file.endsWith('.spec.ts')) continue;
    const text = await readFile(file, 'utf8');
    for (const match of text.matchAll(REF)) {
      const widths = match[4].split(',').map((w) => w.trim()).filter(Boolean);
      for (const width of widths) paths.add(`/img/${match[1]}/${width}.webp`);
    }
  }
  return [...paths].sort();
}

/** Accept an https origin, or http for localhost only. Returns the origin. */
export function parseBaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('The base URL is not a valid URL.');
  }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) {
    throw new Error('The base URL must use https (http is allowed for localhost only).');
  }
  return url.origin;
}

function problems(response) {
  const found = [];
  const cache = response.headers.get('cache-control') ?? '';
  if (!/\bimmutable\b/i.test(cache) || !/max-age=31536000\b/.test(cache)) {
    found.push(`cache-control is "${cache}"`);
  }
  const type = response.headers.get('content-type') ?? '';
  if (!/^image\/webp\b/i.test(type)) found.push(`content-type is "${type}"`);
  return found;
}

/** One HEAD request with retries on throttling, 5xx and network errors. */
export async function checkOne(origin, urlPath, { fetchImpl = fetch, sleep = defaultSleep, random = Math.random } = {}) {
  let reason = 'unknown error';
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    let wait = backoffMs(attempt, random);
    try {
      const response = await fetchImpl(origin + urlPath, {
        method: 'HEAD',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        redirect: 'manual',
      });
      if (response.status === 200) {
        const found = problems(response);
        return found.length === 0 ? { path: urlPath, ok: true } : { path: urlPath, ok: false, reason: found.join('; ') };
      }
      if (!RETRYABLE.has(response.status)) return { path: urlPath, ok: false, reason: `HTTP ${response.status}` };
      reason = `HTTP ${response.status}`;
      wait = retryAfterMs(response.headers.get('retry-after')) ?? wait;
    } catch (error) {
      reason = `network error: ${error?.name ?? 'Error'}`;
    }
    if (attempt < MAX_ATTEMPTS) await sleep(wait);
  }
  return { path: urlPath, ok: false, reason: `${reason} after ${MAX_ATTEMPTS} attempts` };
}

/** Check every ImageRef URL. Returns {total, failures}. */
export async function runVerify({ origin, appDir, concurrency = DOWNLOAD_CONCURRENCY, ...options }) {
  const paths = await collectRefPaths(appDir);
  const results = await pool(paths, concurrency, (p) => checkOne(origin, p, options));
  return { total: paths.length, failures: results.filter((r) => !r.ok) };
}

/** CLI entry. Returns the process exit code. */
export async function verifyMain(argv, overrides = {}) {
  const log = overrides.log ?? ((line) => console.log(line));
  const errorLog = overrides.errorLog ?? ((line) => console.error(line));
  try {
    const { values, positionals } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: { 'app-dir': { type: 'string' }, 'repo-root': { type: 'string' }, help: { type: 'boolean' } },
      strict: true,
    });
    if (values.help) {
      log(USAGE);
      return 0;
    }
    if (positionals.length !== 1) throw new Error('Give exactly one base URL.');
    const origin = parseBaseUrl(positionals[0]);
    const repoRoot = path.resolve(values['repo-root'] ?? overrides.defaultRepoRoot ?? DEFAULT_REPO_ROOT);
    const appDir = path.resolve(repoRoot, values['app-dir'] ?? DEFAULT_APP_DIR);
    const { total, failures } = await runVerify({
      origin,
      appDir,
      fetchImpl: overrides.fetchImpl,
      sleep: overrides.sleep,
      random: overrides.random,
    });
    if (total === 0) throw new Error('No ImageRefs were found in the data files.');
    for (const failure of failures) log(`FAIL ${failure.path}: ${failure.reason}`);
    log(`checked ${total} image URLs, ${failures.length} failed`);
    return failures.length === 0 ? 0 : 1;
  } catch (error) {
    errorLog(`error: ${error?.message ?? error}`);
    errorLog(USAGE);
    return 2;
  }
}
