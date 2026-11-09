import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { PROFILES, PROFILE_NAMES } from './profiles.mjs';

export const MAX_INPUT_BYTES = 25 * 1024 * 1024;
export const MAX_INPUT_PIXELS = 100_000_000;
export const WEBP_QUALITY = 80;

const EXTENSIONS = { jpeg: 'jpg', png: 'png', webp: 'webp' };
const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1']);

export class ImageError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ImageError';
    this.code = code;
  }
}

/** Identify the container from magic bytes (never from a file name). */
export function sniffFormat(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'png';
  }
  if (buffer.length >= 12 && buffer.toString('latin1', 0, 4) === 'RIFF' && buffer.toString('latin1', 8, 12) === 'WEBP') {
    return 'webp';
  }
  if (buffer.length >= 12 && buffer.toString('latin1', 4, 8) === 'ftyp') {
    return HEIC_BRANDS.has(buffer.toString('latin1', 8, 12)) ? 'heic' : 'unknown';
  }
  return 'unknown';
}

/** First 16 hex characters of the SHA-256 of the original bytes. */
export function imageId(buffer) {
  return createHash('sha256').update(buffer).digest('hex').slice(0, 16);
}

function assertInput(buffer, profileName) {
  if (!Object.hasOwn(PROFILES, profileName)) {
    throw new ImageError('BAD_PROFILE', `Unknown profile "${profileName}". Use one of: ${PROFILE_NAMES.join(', ')}.`);
  }
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new ImageError('EMPTY_INPUT', 'The image is empty.');
  }
  if (buffer.length > MAX_INPUT_BYTES) {
    throw new ImageError('TOO_LARGE', `The image is larger than the ${MAX_INPUT_BYTES / 1024 / 1024} MB limit.`);
  }
  const format = sniffFormat(buffer);
  if (format === 'heic') {
    throw new ImageError(
      'HEIC_UNSUPPORTED',
      'HEIC/HEIF images are not supported. Export the photo as JPEG (iPhone: Settings, Camera, Formats, Most Compatible) and try again.',
    );
  }
  if (format === 'unknown') {
    throw new ImageError('UNSUPPORTED_FORMAT', 'Only JPEG, PNG and WebP images are supported.');
  }
  return format;
}

function targetWidths(profileWidths, originalWidth) {
  const capped = new Set(profileWidths.map((w) => Math.min(w, originalWidth)));
  return [...capped].sort((a, b) => a - b);
}

/**
 * Turn an original image into WebP variants.
 *
 * Auto-orients first, then drops all metadata (EXIF, GPS, ICC, XMP): sharp writes none
 * unless asked. Never upscales; always returns at least one variant.
 *
 * @returns {Promise<{id: string, ext: string, w: number, h: number, widths: number[],
 *   variants: {width: number, height: number, buffer: Buffer}[]}>}
 */
export async function processImage(buffer, profileName) {
  const format = assertInput(buffer, profileName);
  const options = { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' };

  let originalWidth;
  try {
    const meta = await sharp(buffer, options).rotate().metadata();
    // After rotate() the reported size is not yet oriented, so swap for 90 degree turns.
    const turned = meta.orientation !== undefined && meta.orientation >= 5;
    originalWidth = turned ? meta.height : meta.width;
  } catch (cause) {
    throw toImageError(cause);
  }

  const widths = targetWidths(PROFILES[profileName], originalWidth);
  const variants = [];
  try {
    for (const width of widths) {
      const { data, info } = await sharp(buffer, options)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer({ resolveWithObject: true });
      variants.push({ width: info.width, height: info.height, buffer: data });
    }
  } catch (cause) {
    throw toImageError(cause);
  }

  const largest = variants[variants.length - 1];
  return {
    id: imageId(buffer),
    ext: EXTENSIONS[format],
    w: largest.width,
    h: largest.height,
    widths: variants.map((v) => v.width),
    variants,
  };
}

function toImageError(cause) {
  const message = String(cause.message);
  if (/pixel limit/i.test(message)) {
    return new ImageError('TOO_MANY_PIXELS', `The image has more than ${MAX_INPUT_PIXELS.toLocaleString('en-US')} pixels.`);
  }
  return new ImageError('CORRUPT_IMAGE', 'The image could not be decoded. It may be corrupt or truncated.');
}
