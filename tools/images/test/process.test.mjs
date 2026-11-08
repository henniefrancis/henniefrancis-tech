import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { ImageError, MAX_INPUT_BYTES, imageId, processImage, sniffFormat } from '../src/process.mjs';
import { avif, heicHeader, jpeg, jpegWithMetadata, png, webp } from './helpers.mjs';

const rejects = async (promise, code) => {
  const error = await promise.then(
    () => null,
    (e) => e,
  );
  expect(error).toBeInstanceOf(ImageError);
  expect(error.code).toBe(code);
  return error;
};

describe('imageId', () => {
  it('is the first 16 hex of the SHA-256 of the original', async () => {
    const buffer = await jpeg();
    expect(imageId(buffer)).toBe(createHash('sha256').update(buffer).digest('hex').slice(0, 16));
    expect(imageId(buffer)).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe('sniffFormat', () => {
  it('recognises JPEG, PNG and WebP by content', async () => {
    expect(sniffFormat(await jpeg())).toBe('jpeg');
    expect(sniffFormat(await png())).toBe('png');
    expect(sniffFormat(await webp())).toBe('webp');
  });

  it('recognises HEIC brands and treats other containers as unknown', async () => {
    expect(sniffFormat(heicHeader())).toBe('heic');
    expect(sniffFormat(await avif())).toBe('unknown');
    expect(sniffFormat(Buffer.from('GIF89a......'))).toBe('unknown');
    expect(sniffFormat(Buffer.from([1, 2]))).toBe('unknown');
  });
});

describe('processImage', () => {
  it('makes WebP variants at the profile widths for a large photo', async () => {
    const result = await processImage(await jpeg(2000, 1000), 'photo');
    expect(result.widths).toEqual([480, 960, 1600]);
    expect(result.w).toBe(1600);
    expect(result.h).toBe(800);
    expect(result.ext).toBe('jpg');
    for (const variant of result.variants) {
      const meta = await sharp(variant.buffer).metadata();
      expect(meta.format).toBe('webp');
      expect(meta.width).toBe(variant.width);
      expect(meta.height).toBe(variant.height);
    }
  });

  it('never upscales: widths are capped at the original width and de-duplicated', async () => {
    const result = await processImage(await png(700, 350), 'photo');
    expect(result.widths).toEqual([480, 700]);
    expect(result.ext).toBe('png');
    expect(result.w).toBe(700);
  });

  it('always returns at least one variant for a tiny image', async () => {
    const result = await processImage(await webp(30, 30), 'photo');
    expect(result.widths).toEqual([30]);
    expect(result.variants).toHaveLength(1);
    expect(result.ext).toBe('webp');
  });

  it('uses 1x and 2x for tile profiles', async () => {
    const result = await processImage(await png(2000, 1000), 'tile');
    expect(result.widths).toEqual([449, 898]);
  });

  it('strips EXIF and GPS and applies the orientation', async () => {
    const input = await jpegWithMetadata(200, 100, 6);
    const inputMeta = await sharp(input).metadata();
    expect(inputMeta.exif).toBeDefined();
    expect(inputMeta.orientation).toBe(6);

    const result = await processImage(input, 'badge');
    // Orientation 6 turns the 200x100 image into 100x200.
    expect(result.widths).toEqual([100]);
    expect(result.h).toBe(200);
    for (const variant of result.variants) {
      const meta = await sharp(variant.buffer).metadata();
      expect(meta.exif).toBeUndefined();
      expect(meta.icc).toBeUndefined();
      expect(meta.xmp).toBeUndefined();
      expect(meta.orientation).toBeUndefined();
      expect(variant.buffer.includes(Buffer.from('test-owner'))).toBe(false);
    }
  });

  it('keeps landscape orientation when the tag does not turn the image', async () => {
    const result = await processImage(await jpegWithMetadata(200, 100, 3), 'badge');
    expect(result.widths).toEqual([150, 200]);
    expect(result.h).toBe(100);
  });

  it('is deterministic for the id', async () => {
    const input = await png(100, 100);
    expect((await processImage(input, 'icon')).id).toBe((await processImage(input, 'icon')).id);
  });

  it('rejects an unknown profile', async () => {
    await rejects(processImage(await png(), 'nope'), 'BAD_PROFILE');
    await rejects(processImage(await png(), '__proto__'), 'BAD_PROFILE');
  });

  it('rejects empty and non-buffer input', async () => {
    await rejects(processImage(Buffer.alloc(0), 'photo'), 'EMPTY_INPUT');
    await rejects(processImage('text', 'photo'), 'EMPTY_INPUT');
  });

  it('rejects input over 25 MB', async () => {
    await rejects(processImage(Buffer.alloc(MAX_INPUT_BYTES + 1), 'photo'), 'TOO_LARGE');
  });

  it('rejects HEIC with a clear message', async () => {
    const error = await rejects(processImage(heicHeader(), 'photo'), 'HEIC_UNSUPPORTED');
    expect(error.message).toMatch(/HEIC/);
    expect(error.message).toMatch(/JPEG/);
  });

  it('rejects other formats', async () => {
    await rejects(processImage(await avif(), 'photo'), 'UNSUPPORTED_FORMAT');
    await rejects(processImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), 'photo'), 'UNSUPPORTED_FORMAT');
  });

  it('rejects a corrupt image', async () => {
    const good = await png(50, 50);
    await rejects(processImage(good.subarray(0, 30), 'photo'), 'CORRUPT_IMAGE');
  });

  it('rejects a truncated image with a valid header but broken data', async () => {
    const good = await jpeg(400, 400);
    await rejects(processImage(good.subarray(0, Math.floor(good.length / 2)), 'photo'), 'CORRUPT_IMAGE');
  });

  it(
    'rejects an image over the pixel limit',
    async () => {
      const huge = await sharp({ create: { width: 10001, height: 10001, channels: 3, background: '#000' } })
        .png({ compressionLevel: 9 })
        .toBuffer();
      await rejects(processImage(huge, 'photo'), 'TOO_MANY_PIXELS');
    },
    60_000,
  );
});
