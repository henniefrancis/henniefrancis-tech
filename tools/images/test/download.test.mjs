import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_ATTEMPTS, backoffMs, download, retryAfterMs } from '../src/download.mjs';
import { MAX_INPUT_BYTES } from '../src/process.mjs';
import { response } from './helpers.mjs';

const URL_OK = 'https://example.test/a.png';
const fixed = () => 0.5;

afterEach(() => vi.unstubAllGlobals());

describe('retryAfterMs', () => {
  it('parses seconds and ignores junk', () => {
    expect(retryAfterMs('2')).toBe(2000);
    expect(retryAfterMs('0')).toBe(0);
    expect(retryAfterMs('999')).toBe(20_000);
    expect(retryAfterMs(null)).toBeNull();
    expect(retryAfterMs('soon')).toBeNull();
    expect(retryAfterMs('-3')).toBeNull();
  });
});

describe('backoffMs', () => {
  it('grows exponentially with jitter and is capped', () => {
    expect(backoffMs(1, () => 0)).toBe(250);
    expect(backoffMs(1, () => 0.999)).toBeLessThanOrEqual(500);
    expect(backoffMs(3, () => 0)).toBe(1000);
    expect(backoffMs(30, () => 0)).toBe(10_000);
    expect(backoffMs(1)).toBeGreaterThanOrEqual(250);
  });
});

describe('download', () => {
  it('returns the body on 200', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(200, { body: Buffer.from('abc') }));
    const result = await download(URL_OK, { fetchImpl, random: fixed });
    expect(result.status).toBe('ok');
    expect(result.buffer.toString()).toBe('abc');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('refuses non-https URLs without fetching', async () => {
    const fetchImpl = vi.fn();
    const result = await download('http://example.test/a.png', { fetchImpl });
    expect(result).toEqual({ status: 'failed', reason: 'only https URLs are downloaded' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each([403, 404, 410])('records HTTP %i as unavailable without retrying', async (status) => {
    const fetchImpl = vi.fn().mockResolvedValue(response(status));
    const sleep = vi.fn();
    const result = await download(URL_OK, { fetchImpl, sleep });
    expect(result).toEqual({ status: 'unavailable', httpStatus: status });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('retries throttling and honours Retry-After', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response(429, { headers: { 'Retry-After': '3' } }))
      .mockResolvedValueOnce(response(503))
      .mockResolvedValueOnce(response(200, { body: Buffer.from('ok') }));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const log = vi.fn();
    const result = await download(URL_OK, { fetchImpl, sleep, random: fixed, log });
    expect(result.status).toBe('ok');
    expect(sleep).toHaveBeenNthCalledWith(1, 3000);
    expect(sleep).toHaveBeenNthCalledWith(2, backoffMs(2, fixed));
    expect(log).toHaveBeenCalledTimes(2);
  });

  it('retries network errors, then gives up as failed', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('boom'));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const result = await download(URL_OK, { fetchImpl, sleep, random: fixed });
    expect(result.status).toBe('failed');
    expect(result.reason).toBe(`network error: TypeError after ${MAX_ATTEMPTS} attempts`);
    expect(fetchImpl).toHaveBeenCalledTimes(MAX_ATTEMPTS);
    expect(sleep).toHaveBeenCalledTimes(MAX_ATTEMPTS - 1);
  });

  it('names a nameless thrown value generically', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(null);
    const result = await download(URL_OK, { fetchImpl, sleep: async () => {}, random: fixed });
    expect(result.reason).toContain('network error: Error');
  });

  it('fails after repeated 500s', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(500));
    const result = await download(URL_OK, { fetchImpl, sleep: async () => {}, random: fixed });
    expect(result).toEqual({ status: 'failed', reason: `HTTP 500 after ${MAX_ATTEMPTS} attempts` });
  });

  it('rejects a redirect to a non-https URL', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(200, { url: 'http://example.test/a.png' }));
    expect((await download(URL_OK, { fetchImpl })).reason).toBe('redirected to a non-https URL');
  });

  it('accepts a response with no url', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(200, { url: '', body: Buffer.from('x') }));
    expect((await download(URL_OK, { fetchImpl })).status).toBe('ok');
  });

  it('rejects an oversized content-length', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(200, { headers: { 'content-length': String(MAX_INPUT_BYTES + 1) } }));
    expect((await download(URL_OK, { fetchImpl })).reason).toBe('larger than the input size limit');
  });

  it('rejects an oversized body that lied about its length', async () => {
    const body = Buffer.alloc(MAX_INPUT_BYTES + 1);
    const fetchImpl = vi.fn().mockResolvedValue(response(200, { body }));
    expect((await download(URL_OK, { fetchImpl })).reason).toBe('larger than the input size limit');
  });

  it('uses the global fetch and real sleep by default', async () => {
    const fetchStub = vi
      .fn()
      .mockResolvedValueOnce(response(503, { headers: { 'retry-after': '0' } }))
      .mockResolvedValueOnce(response(200, { body: Buffer.from('z') }));
    vi.stubGlobal('fetch', fetchStub);
    const result = await download(URL_OK);
    expect(result.status).toBe('ok');
    expect(fetchStub).toHaveBeenCalledTimes(2);
  });
});
