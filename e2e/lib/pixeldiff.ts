import type { Page } from '@playwright/test';
import type { Box } from './collect';
import type { PixelResult } from './compare';

/**
 * Pixel comparison done in a browser canvas, so no image libraries are needed.
 * A pixel counts as different when any RGB channel differs by more than
 * CHANNEL_THRESHOLD (absorbs anti-aliasing noise). Image boxes (from either
 * snapshot) are measured on their own; everything else is the strict text
 * region. Boxes are in CSS pixels, equal to image pixels because visual runs
 * use deviceScaleFactor 1.
 */
export const CHANNEL_THRESHOLD = 24;

export async function diffPngs(
  page: Page,
  baseline: Buffer,
  current: Buffer,
  boxes: { path: string; box: Box }[],
): Promise<PixelResult> {
  await page.goto('about:blank');
  return page.evaluate(
    async ({ a, b, boxes, threshold }) => {
      const load = (b64: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('image decode failed'));
          img.src = 'data:image/png;base64,' + b64;
        });
      const [ia, ib] = await Promise.all([load(a), load(b)]);
      const w = Math.min(ia.naturalWidth, ib.naturalWidth);
      const h = Math.min(ia.naturalHeight, ib.naturalHeight);
      const read = (img: HTMLImageElement) => {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d', { willReadFrequently: true })!;
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, w, h).data;
      };
      const da = read(ia);
      const db = read(ib);
      const differs = (i: number) =>
        Math.abs(da[i] - db[i]) > threshold ||
        Math.abs(da[i + 1] - db[i + 1]) > threshold ||
        Math.abs(da[i + 2] - db[i + 2]) > threshold;

      const inBox = new Uint8Array(w * h);
      const imageRatios: { path: string; ratio: number }[] = [];
      const seen = new Set<string>();
      for (const { path, box } of boxes) {
        const key = `${path}|${box.x}|${box.y}|${box.w}|${box.h}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const x0 = Math.max(0, Math.floor(box.x));
        const y0 = Math.max(0, Math.floor(box.y));
        const x1 = Math.min(w, Math.ceil(box.x + box.w));
        const y1 = Math.min(h, Math.ceil(box.y + box.h));
        let total = 0;
        let diff = 0;
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            const p = y * w + x;
            inBox[p] = 1;
            total++;
            if (differs(p * 4)) diff++;
          }
        }
        if (total > 0) imageRatios.push({ path, ratio: diff / total });
      }
      let textTotal = 0;
      let textDiff = 0;
      for (let p = 0; p < w * h; p++) {
        if (inBox[p]) continue;
        textTotal++;
        if (differs(p * 4)) textDiff++;
      }
      return {
        width: ia.naturalWidth,
        height: ia.naturalHeight,
        curWidth: ib.naturalWidth,
        curHeight: ib.naturalHeight,
        textRegionRatio: textTotal ? textDiff / textTotal : 0,
        imageRatios,
      };
    },
    { a: baseline.toString('base64'), b: current.toString('base64'), boxes, threshold: CHANNEL_THRESHOLD },
  );
}
