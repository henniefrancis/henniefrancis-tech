import { IMAGE_LOADER } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { IMAGE_BASE, IMAGE_LOADER_PROVIDER, imageLoader, imageSrc, imageView, imageViewOf } from './image';

describe('image', () => {
  const ref = { id: '0123456789abcdef', w: 960, h: 480, widths: [480, 960] };

  it('serves images from /img/', () => {
    expect(IMAGE_BASE).toBe('/img/');
  });

  it('builds the URL of the largest variant by default', () => {
    expect(imageSrc(ref)).toBe('/img/0123456789abcdef/960.webp');
  });

  it('builds the URL of a chosen variant', () => {
    expect(imageSrc(ref, 480)).toBe('/img/0123456789abcdef/480.webp');
  });
});

describe('imageLoader', () => {
  const src = '0123456789abcdef';
  const loaderParams = { widths: [960, 480, 1600] };

  it('uses an exact width when it exists', () => {
    expect(imageLoader({ src, width: 960, loaderParams })).toBe('/img/0123456789abcdef/960.webp');
  });

  it('rounds a width up to the nearest variant that exists', () => {
    expect(imageLoader({ src, width: 481, loaderParams })).toBe('/img/0123456789abcdef/960.webp');
    expect(imageLoader({ src, width: 100, loaderParams })).toBe('/img/0123456789abcdef/480.webp');
  });

  it('falls back to the largest variant when the width is larger than all of them or not given', () => {
    expect(imageLoader({ src, width: 4000, loaderParams })).toBe('/img/0123456789abcdef/1600.webp');
    expect(imageLoader({ src, loaderParams })).toBe('/img/0123456789abcdef/1600.webp');
  });

  it('does not change the order of the caller widths', () => {
    imageLoader({ src, width: 500, loaderParams });
    expect(loaderParams.widths).toEqual([960, 480, 1600]);
  });

  it('refuses an image without listed variants', () => {
    expect(() => imageLoader({ src, width: 100 })).toThrow(/has no variants/);
    expect(() => imageLoader({ src, width: 100, loaderParams: { widths: [] } })).toThrow(/has no variants/);
  });

  it('is registered as the application image loader', () => {
    TestBed.configureTestingModule({ providers: [IMAGE_LOADER_PROVIDER] });
    expect(TestBed.inject(IMAGE_LOADER)).toBe(imageLoader);
  });
});

describe('imageView', () => {
  const ref = { id: 'fedcba9876543210', w: 898, h: 351, widths: [449, 898] };

  it('describes the image for NgOptimizedImage', () => {
    expect(imageView(ref)).toEqual({
      ngSrc: 'fedcba9876543210',
      ngSrcset: '449w, 898w',
      sizes: '449px',
      width: 898,
      height: 351,
      loaderParams: { widths: [449, 898] },
    });
  });

  it('takes the displayed size from the caller when it is given', () => {
    expect(imageView(ref, '100vw').sizes).toBe('100vw');
  });
});

describe('imageViewOf', () => {
  const img = { id: 'fedcba9876543210', w: 898, h: 351, widths: [449, 898], alt: 'Tile' };

  it('adds the alternative text to the view', () => {
    expect(imageViewOf(img)).toEqual({ ...imageView(img), alt: 'Tile' });
  });

  it('passes the displayed size on', () => {
    expect(imageViewOf(img, '100vw').sizes).toBe('100vw');
  });
});
