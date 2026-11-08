/** Base path of the image store behind CloudFront. Images are served from /img/{id}/{width}.webp. */
export const IMAGE_BASE = '/img/';

/** Image reference: w and h are the size of the largest variant; widths lists every variant width. */
export interface ImageRef {
  id: string;
  w: number;
  h: number;
  widths: number[];
}

/** URL of one variant of an image (the largest by default). */
export function imageSrc(ref: ImageRef, width: number = ref.w): string {
  return `${IMAGE_BASE}${ref.id}/${width}.webp`;
}
