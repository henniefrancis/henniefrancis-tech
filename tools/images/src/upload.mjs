import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { pool } from './pool.mjs';

export const CACHE_CONTROL = 'public, max-age=31536000, immutable';
export const UPLOAD_CONCURRENCY = 4;

const BUCKET_PATTERN = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;
const ID_PATTERN = /^[0-9a-f]{16}$/;
const ORIGINAL_TYPES = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

/** The bucket name comes only from the IMAGE_BUCKET environment variable. */
export function bucketFromEnv(env) {
  const bucket = env.IMAGE_BUCKET?.trim();
  if (!bucket) {
    throw new Error('IMAGE_BUCKET is not set. Export the image bucket name first.');
  }
  if (!BUCKET_PATTERN.test(bucket)) {
    throw new Error('IMAGE_BUCKET is not a valid S3 bucket name.');
  }
  return bucket;
}

function isAlreadyThere(error) {
  return error?.name === 'PreconditionFailed' || error?.$metadata?.httpStatusCode === 412;
}

/**
 * PutObject with If-None-Match: * so an existing key is never overwritten.
 * Returns 'uploaded' or 'exists' (idempotent re-runs).
 */
export async function putOnce(client, params) {
  try {
    await client.send(new PutObjectCommand({ ...params, IfNoneMatch: '*' }));
    return 'uploaded';
  } catch (error) {
    if (isAlreadyThere(error)) return 'exists';
    throw error;
  }
}

/** Upload the WebP variants of one processed image and its original. */
export async function uploadImage(client, bucket, image, original) {
  if (!ID_PATTERN.test(image.id)) {
    throw new Error('Image id must be 16 lowercase hex characters.');
  }
  const originalType = ORIGINAL_TYPES[image.ext];
  if (!originalType) {
    throw new Error('Unsupported original extension.');
  }
  const puts = image.variants.map((variant) => ({
    Bucket: bucket,
    Key: `img/${image.id}/${variant.width}.webp`,
    Body: variant.buffer,
    ContentType: 'image/webp',
    CacheControl: CACHE_CONTROL,
  }));
  puts.push({
    Bucket: bucket,
    Key: `originals/${image.id}.${image.ext}`,
    Body: original,
    ContentType: originalType,
  });
  const counts = { uploaded: 0, exists: 0 };
  for (const params of puts) {
    counts[await putOnce(client, params)] += 1;
  }
  return counts;
}

/**
 * Upload every processed image listed in out/manifest.json.
 * Reads variants from out/<id>/<width>.webp and originals from out/originals/<id>.<ext>.
 */
export async function uploadOutDir(client, bucket, outDir, manifest, log = () => {}) {
  const byId = new Map();
  for (const entry of manifest.images) {
    if (entry.status === 'processed') byId.set(entry.ref.id, entry);
  }
  const totals = { images: byId.size, uploaded: 0, exists: 0 };
  await pool([...byId.values()], UPLOAD_CONCURRENCY, async (entry) => {
    const { id, widths } = entry.ref;
    const variants = [];
    for (const width of widths) {
      variants.push({ width, buffer: await readFile(path.join(outDir, id, `${width}.webp`)) });
    }
    const original = await readFile(path.join(outDir, 'originals', `${id}.${entry.ext}`));
    const counts = await uploadImage(client, bucket, { id, ext: entry.ext, variants }, original);
    totals.uploaded += counts.uploaded;
    totals.exists += counts.exists;
    log(`uploaded ${id}: ${counts.uploaded} new, ${counts.exists} already present`);
  });
  return totals;
}
