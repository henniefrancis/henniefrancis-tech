import { IMAGE_BASE, imageSrc } from './image';

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
