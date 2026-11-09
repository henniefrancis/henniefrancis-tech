import sharp from 'sharp';

const base = (width, height) => ({ create: { width, height, channels: 3, background: '#336699' } });

export const jpeg = (width = 40, height = 20) => sharp(base(width, height)).jpeg().toBuffer();
export const png = (width = 40, height = 20) => sharp(base(width, height)).png().toBuffer();
export const webp = (width = 40, height = 20) => sharp(base(width, height)).webp().toBuffer();
export const avif = (width = 40, height = 20) => sharp(base(width, height)).heif({ compression: 'av1' }).toBuffer();

/** A JPEG carrying EXIF with a GPS position, a copyright string and an orientation tag. */
export function jpegWithMetadata(width, height, orientation) {
  return sharp(base(width, height))
    .jpeg()
    .withExif({
      IFD0: { Copyright: 'test-owner' },
      IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '1/1 2/1 3/1' },
    })
    .withMetadata({ orientation })
    .toBuffer();
}

/** A fake HEIC header: size, "ftyp", brand. */
export const heicHeader = () => Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypheic'), Buffer.alloc(12)]);

export function response(status, { body = Buffer.alloc(0), headers = {}, url = 'https://example.test/x.png' } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    url,
    headers: new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])),
    arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
  };
}
