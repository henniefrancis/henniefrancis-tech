import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { CACHE_CONTROL, bucketFromEnv, putOnce, uploadImage, uploadOutDir } from '../src/upload.mjs';

const mockClient = (impl = async () => ({})) => ({ send: vi.fn(impl) });
const inputOf = (client, n) => client.send.mock.calls[n][0].input;

describe('bucketFromEnv', () => {
  it('reads and trims IMAGE_BUCKET', () => {
    expect(bucketFromEnv({ IMAGE_BUCKET: '  my-bucket-1 ' })).toBe('my-bucket-1');
  });

  it('requires it', () => {
    expect(() => bucketFromEnv({})).toThrow(/IMAGE_BUCKET is not set/);
    expect(() => bucketFromEnv({ IMAGE_BUCKET: '   ' })).toThrow(/not set/);
  });

  it('rejects invalid names', () => {
    expect(() => bucketFromEnv({ IMAGE_BUCKET: 'Bad_Bucket' })).toThrow(/not a valid/);
    expect(() => bucketFromEnv({ IMAGE_BUCKET: 'a' })).toThrow(/not a valid/);
  });
});

describe('putOnce', () => {
  it('sends If-None-Match: * and reports uploaded', async () => {
    const client = mockClient();
    expect(await putOnce(client, { Bucket: 'b', Key: 'k', Body: Buffer.from('x') })).toBe('uploaded');
    expect(inputOf(client, 0).IfNoneMatch).toBe('*');
  });

  it('treats a failed precondition as already present', async () => {
    const byName = mockClient(async () => {
      throw Object.assign(new Error('x'), { name: 'PreconditionFailed' });
    });
    const byStatus = mockClient(async () => {
      throw Object.assign(new Error('x'), { $metadata: { httpStatusCode: 412 } });
    });
    expect(await putOnce(byName, {})).toBe('exists');
    expect(await putOnce(byStatus, {})).toBe('exists');
  });

  it('rethrows other errors, including a nullish one', async () => {
    const denied = mockClient(async () => {
      throw Object.assign(new Error('denied'), { name: 'AccessDenied' });
    });
    await expect(putOnce(denied, {})).rejects.toThrow('denied');
    const nullish = mockClient(async () => {
      throw null;
    });
    await expect(putOnce(nullish, {})).rejects.toBeNull();
  });
});

describe('uploadImage', () => {
  const image = {
    id: '0123456789abcdef',
    ext: 'jpg',
    variants: [
      { width: 480, buffer: Buffer.from('a') },
      { width: 960, buffer: Buffer.from('b') },
    ],
  };

  it('uploads variants and the original with the agreed headers and keys', async () => {
    const client = mockClient();
    const counts = await uploadImage(client, 'bkt-1', image, Buffer.from('orig'));
    expect(counts).toEqual({ uploaded: 3, exists: 0 });
    expect(inputOf(client, 0)).toMatchObject({
      Bucket: 'bkt-1',
      Key: 'img/0123456789abcdef/480.webp',
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
      IfNoneMatch: '*',
    });
    expect(CACHE_CONTROL).toBe('public, max-age=31536000, immutable');
    expect(inputOf(client, 1).Key).toBe('img/0123456789abcdef/960.webp');
    expect(inputOf(client, 2)).toMatchObject({
      Key: 'originals/0123456789abcdef.jpg',
      ContentType: 'image/jpeg',
      IfNoneMatch: '*',
    });
    expect(inputOf(client, 2).CacheControl).toBeUndefined();
  });

  it('counts existing objects as skipped', async () => {
    const client = mockClient(async () => {
      throw Object.assign(new Error('x'), { name: 'PreconditionFailed' });
    });
    expect(await uploadImage(client, 'bkt-1', image, Buffer.from('o'))).toEqual({ uploaded: 0, exists: 3 });
  });

  it('maps png and webp originals', async () => {
    const client = mockClient();
    await uploadImage(client, 'b-1', { ...image, ext: 'png', variants: [] }, Buffer.from('o'));
    await uploadImage(client, 'b-1', { ...image, ext: 'webp', variants: [] }, Buffer.from('o'));
    expect(inputOf(client, 0).ContentType).toBe('image/png');
    expect(inputOf(client, 1).ContentType).toBe('image/webp');
  });

  it('rejects a bad id or extension before sending anything', async () => {
    const client = mockClient();
    await expect(uploadImage(client, 'b-1', { ...image, id: '../evil' }, Buffer.from('o'))).rejects.toThrow(/16 lowercase hex/);
    await expect(uploadImage(client, 'b-1', { ...image, ext: 'exe' }, Buffer.from('o'))).rejects.toThrow(/extension/);
    expect(client.send).not.toHaveBeenCalled();
  });
});

describe('uploadOutDir', () => {
  it('uploads each processed image once, from the out folder layout', async () => {
    const out = await mkdtemp(path.join(os.tmpdir(), 'img-out-'));
    const id = 'aaaaaaaaaaaaaaaa';
    await mkdir(path.join(out, id), { recursive: true });
    await mkdir(path.join(out, 'originals'), { recursive: true });
    await writeFile(path.join(out, id, '100.webp'), 'v1');
    await writeFile(path.join(out, id, '200.webp'), 'v2');
    await writeFile(path.join(out, 'originals', `${id}.png`), 'orig');
    const processed = (url) => ({ url, status: 'processed', ext: 'png', ref: { id, w: 200, h: 100, widths: [100, 200] } });
    const manifest = {
      images: [processed('u1'), processed('u2'), { url: 'u3', status: 'unavailable' }],
    };
    const client = mockClient();
    const log = vi.fn();
    const totals = await uploadOutDir(client, 'bkt-1', out, manifest, log);
    expect(totals).toEqual({ images: 1, uploaded: 3, exists: 0 });
    expect(client.send).toHaveBeenCalledTimes(3);
    expect(log).toHaveBeenCalledTimes(1);
  });

  it('works without a logger', async () => {
    const out = await mkdtemp(path.join(os.tmpdir(), 'img-out-'));
    await mkdir(path.join(out, 'bbbbbbbbbbbbbbbb'), { recursive: true });
    await mkdir(path.join(out, 'originals'), { recursive: true });
    await writeFile(path.join(out, 'bbbbbbbbbbbbbbbb', '10.webp'), 'v');
    await writeFile(path.join(out, 'originals', 'bbbbbbbbbbbbbbbb.jpg'), 'o');
    const manifest = { images: [{ status: 'processed', ext: 'jpg', ref: { id: 'bbbbbbbbbbbbbbbb', widths: [10] } }] };
    expect(await uploadOutDir(mockClient(), 'bkt-1', out, manifest)).toEqual({ images: 1, uploaded: 2, exists: 0 });
  });
});
