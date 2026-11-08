import { IMAGE_LOADER, ImageLoaderConfig } from '@angular/common';
import { Provider } from '@angular/core';

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

/** Extra loader input that tells the loader which variant widths exist for an image. */
export interface ImageLoaderParams {
  widths: number[];
}

/**
 * Image loader for NgOptimizedImage. The source is the image id. The requested width is rounded up
 * to the nearest variant that exists, and no width at all means the largest variant.
 */
export function imageLoader(config: ImageLoaderConfig): string {
  const widths = ((config.loaderParams as Partial<ImageLoaderParams> | undefined)?.widths ?? [])
    .slice()
    .sort((a, b) => a - b);
  if (widths.length === 0) {
    throw new Error(`Image ${config.src} has no variants listed in its loader parameters.`);
  }
  const width = widths.find((w) => w >= (config.width ?? Infinity)) ?? widths[widths.length - 1];
  return `${IMAGE_BASE}${config.src}/${width}.webp`;
}

/** Registers the loader for the application (and for tests that render images). */
export const IMAGE_LOADER_PROVIDER: Provider = { provide: IMAGE_LOADER, useValue: imageLoader };

/** Everything a template binds on an NgOptimizedImage element for one image. */
export interface ImageView {
  ngSrc: string;
  ngSrcset: string;
  sizes: string;
  width: number;
  height: number;
  loaderParams: ImageLoaderParams;
}

/** Bindings for NgOptimizedImage plus the alternative text from the content. */
export interface ImageViewWithAlt extends ImageView {
  alt: string;
}

/**
 * Bindings for NgOptimizedImage. Without an explicit `sizes`, the smallest variant is taken as the
 * displayed width (the tile, badge, icon and logo variants are made at 1x and 2x of it).
 */
export function imageView(ref: ImageRef, sizes: string = `${Math.min(...ref.widths)}px`): ImageView {
  return {
    ngSrc: ref.id,
    ngSrcset: ref.widths.map((w) => `${w}w`).join(', '),
    sizes,
    width: ref.w,
    height: ref.h,
    loaderParams: { widths: ref.widths },
  };
}

/** The view of a content image: its NgOptimizedImage bindings and its alternative text. */
export function imageViewOf(img: ImageRef & { alt: string }, sizes?: string): ImageViewWithAlt {
  return { ...imageView(img, sizes), alt: img.alt };
}
