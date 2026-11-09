import { MAX_INPUT_BYTES } from './process.mjs';

export const DOWNLOAD_CONCURRENCY = 4;
export const MAX_ATTEMPTS = 5;
export const BASE_DELAY_MS = 500;
export const MAX_DELAY_MS = 20_000;
export const REQUEST_TIMEOUT_MS = 30_000;

export const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504]);
export const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Seconds in Retry-After (HTTP-date form is ignored) to milliseconds, capped. */
export function retryAfterMs(header) {
  const seconds = Number(header);
  if (!header || !Number.isFinite(seconds) || seconds < 0) return null;
  return Math.min(seconds * 1000, MAX_DELAY_MS);
}

/** Exponential backoff with jitter. `random` returns [0, 1). */
export function backoffMs(attempt, random = Math.random) {
  const exp = Math.min(BASE_DELAY_MS * 2 ** (attempt - 1), MAX_DELAY_MS);
  return Math.round(exp / 2 + random() * (exp / 2));
}

/**
 * Download one image over public HTTPS.
 * Returns {status: 'ok', buffer} | {status: 'unavailable', httpStatus} | {status: 'failed', reason}.
 * 4xx other than throttling (for example 403 or 404) is final: it will not get better with retries.
 * Throttling (429, 503), other 5xx and network errors are retried with backoff.
 */
export async function download(url, { fetchImpl = fetch, sleep = defaultSleep, random = Math.random, log = () => {} } = {}) {
  if (!url.startsWith('https://')) {
    return { status: 'failed', reason: 'only https URLs are downloaded' };
  }
  let reason = 'unknown error';
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    let wait = backoffMs(attempt, random);
    try {
      const response = await fetchImpl(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), redirect: 'follow' });
      if (response.url && !response.url.startsWith('https://')) {
        return { status: 'failed', reason: 'redirected to a non-https URL' };
      }
      if (response.ok) {
        const length = Number(response.headers.get('content-length'));
        if (length > MAX_INPUT_BYTES) return { status: 'failed', reason: 'larger than the input size limit' };
        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length > MAX_INPUT_BYTES) return { status: 'failed', reason: 'larger than the input size limit' };
        return { status: 'ok', buffer };
      }
      if (!RETRYABLE.has(response.status)) {
        return { status: 'unavailable', httpStatus: response.status };
      }
      reason = `HTTP ${response.status}`;
      wait = retryAfterMs(response.headers.get('retry-after')) ?? wait;
    } catch (error) {
      reason = `network error: ${error?.name ?? 'Error'}`;
    }
    if (attempt < MAX_ATTEMPTS) {
      log(`retry ${attempt}/${MAX_ATTEMPTS - 1} after ${wait} ms (${reason})`);
      await sleep(wait);
    }
  }
  return { status: 'failed', reason: `${reason} after ${MAX_ATTEMPTS} attempts` };
}
