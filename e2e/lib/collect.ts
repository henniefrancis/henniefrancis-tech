import type { Page } from '@playwright/test';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface ElementRecord {
  path: string;
  tag: string;
  box: Box;
  id?: string;
  cls?: string;
}
export interface TextRecord {
  path: string;
  text: string;
  box: Box;
  style: {
    family: string;
    size: string;
    weight: string;
    fontStyle: string;
    color: string;
    lineHeight: string;
    letterSpacing: string;
  };
}
export interface ImageBox {
  path: string;
  box: Box;
}
export interface Snapshot {
  elements: ElementRecord[];
  texts: TextRecord[];
  images: ImageBox[];
  doc: { scrollWidth: number; scrollHeight: number; clientWidth: number; title: string };
}

/**
 * Collects geometry and text from the live DOM. Runs inside the page, so the
 * evaluated function is self-contained. Visually hidden nodes (1px clip
 * pattern, display none, visibility hidden) are excluded: they are not
 * visible, so they are neither geometry nor text for the visual comparison.
 */
export async function collectSnapshot(page: Page): Promise<Snapshot> {
  return page.evaluate(() => {
    const SKIP = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'NOSCRIPT', 'HEAD', 'TITLE', 'BASE', 'TEMPLATE']);
    const round = (n: number) => Math.round(n * 100) / 100;
    const sx = window.scrollX;
    const sy = window.scrollY;
    const boxOf = (r: DOMRect) => ({ x: round(r.x + sx), y: round(r.y + sy), w: round(r.width), h: round(r.height) });

    const pathOf = (el: Element): string => {
      const parts: string[] = [];
      let n: Element | null = el;
      while (n) {
        let i = 1;
        let s = n.previousElementSibling;
        while (s) {
          if (s.tagName === n.tagName) i++;
          s = s.previousElementSibling;
        }
        parts.unshift(`${n.tagName.toLowerCase()}[${i}]`);
        n = n.parentElement;
      }
      return parts.join('/');
    };

    const isVisible = (el: Element): boolean => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none') return false;
      if (cs.visibility === 'hidden') return false;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return false;
      // Visually-hidden pattern (for example Bootstrap visually-hidden).
      if (r.width <= 1 && r.height <= 1) return false;
      return true;
    };

    const visibleCache = new Map<Element, boolean>();
    const visibleAll = (el: Element): boolean => {
      const c = visibleCache.get(el);
      if (c !== undefined) return c;
      const v = isVisible(el);
      visibleCache.set(el, v);
      return v;
    };

    const elements: ElementRecord[] = [];
    const images: ImageBox[] = [];
    const texts: TextRecord[] = [];

    for (const el of Array.from(document.body.querySelectorAll('*'))) {
      if (SKIP.has(el.tagName)) continue;
      if (!visibleAll(el)) continue;
      const box = boxOf(el.getBoundingClientRect());
      const rec: ElementRecord = { path: pathOf(el), tag: el.tagName.toLowerCase(), box };
      if (el.id) rec.id = el.id;
      if (typeof el.className === 'string' && el.className) rec.cls = el.className;
      elements.push(rec);
      const bg = getComputedStyle(el).backgroundImage;
      if (el.tagName === 'IMG' || (bg && bg !== 'none' && bg.includes('url('))) {
        images.push({ path: rec.path, box });
      }
    }
    elements.unshift({ path: 'body[1]', tag: 'body', box: boxOf(document.body.getBoundingClientRect()) });

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const parent = n.parentElement;
      const text = (n.nodeValue ?? '').replace(/\s+/g, ' ').trim();
      if (!parent || !text || SKIP.has(parent.tagName) || !visibleAll(parent)) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      const rr = range.getBoundingClientRect();
      if (rr.width <= 1 && rr.height <= 1) continue;
      const cs = getComputedStyle(parent);
      texts.push({
        path: pathOf(parent),
        text,
        box: boxOf(rr),
        style: {
          family: cs.fontFamily,
          size: cs.fontSize,
          weight: cs.fontWeight,
          fontStyle: cs.fontStyle,
          color: cs.color,
          lineHeight: cs.lineHeight,
          letterSpacing: cs.letterSpacing,
        },
      });
    }

    const de = document.documentElement;
    return {
      elements,
      texts,
      images,
      doc: {
        scrollWidth: de.scrollWidth,
        scrollHeight: de.scrollHeight,
        clientWidth: de.clientWidth,
        title: document.title,
      },
    };
  });
}
