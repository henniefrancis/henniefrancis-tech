import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Page } from '@playwright/test';
import { collectSnapshot } from './collect';
import type { Snapshot } from './collect';
import { installStabiliser, waitForSettled } from './stabilise';

/** Value-free label for a bad response: status or "failed", then the path (same origin) or the last two path parts (other hosts). */
export function badLabel(what: string, url: string, siteOrigin: string): string {
  const u = new URL(url);
  return `${what} ${u.origin === siteOrigin ? u.pathname : 'external:' + u.pathname.split('/').slice(-2).join('/')}`;
}

export interface PageMeta {
  route: string;
  status: number;
  finalPath: string;
  title: string;
  viewport: { width: number; height: number } | null;
  capturedAt: string;
  /** HTTP 4xx and 5xx responses and failed requests seen while loading. Hosts are never recorded. */
  badResponses: string[];
}

export interface Captured {
  meta: PageMeta;
  snapshot: Snapshot;
  textLines: string[];
  png: Buffer;
}

/** Normalised visible text: one line per visible text node, in document order. */
export function textLinesOf(snapshot: Snapshot): string[] {
  return snapshot.texts.map((t) => t.text);
}

/**
 * Loads one route and captures a full-page PNG, the geometry snapshot and the
 * normalised text. The flowfield canvas is hidden in the PNG. Never sleeps:
 * it waits on app state (see waitForSettled).
 */
export async function capturePage(page: Page, route: string): Promise<Captured> {
  const bad: { what: string; url: string }[] = [];
  page.on('response', (r) => {
    if (r.status() >= 400) bad.push({ what: String(r.status()), url: r.url() });
  });
  page.on('requestfailed', (r) => {
    // ERR_ABORTED is benign (a request superseded by the eager reload of a lazy image).
    if (r.failure()?.errorText !== 'net::ERR_ABORTED') bad.push({ what: 'failed', url: r.url() });
  });
  await installStabiliser(page);
  const response = await page.goto(route, { waitUntil: 'load' });
  const status = response?.status() ?? 0;
  await waitForSettled(page);
  const siteOrigin = new URL(page.url()).origin;
  const badResponses = bad.map(({ what, url }) => badLabel(what, url, siteOrigin));
  const broken = await page.evaluate(() =>
    Array.from(document.images)
      .filter((i) => i.complete && i.naturalWidth === 0)
      .map((i) => new URL(i.currentSrc || i.src, location.href).pathname.split('/').slice(-2).join('/')),
  );
  for (const b of broken) badResponses.push(`broken-image ${b}`);
  const snapshot = await collectSnapshot(page);
  const png = await page.screenshot({
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
    // The flowfield canvas is animated and fixed behind the content: hide it.
    style: '#flowfield { visibility: hidden !important; }',
  });
  return {
    meta: {
      route,
      status,
      finalPath: new URL(page.url()).pathname,
      title: snapshot.doc.title,
      viewport: page.viewportSize(),
      capturedAt: new Date().toISOString(),
      badResponses,
    },
    snapshot,
    textLines: textLinesOf(snapshot),
    png,
  };
}

export function writeCapture(dir: string, c: Captured): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'page.png'), c.png);
  writeFileSync(join(dir, 'geometry.json'), JSON.stringify(c.snapshot) + '\n');
  writeFileSync(join(dir, 'text.txt'), c.textLines.join('\n') + '\n');
  writeFileSync(join(dir, 'meta.json'), JSON.stringify(c.meta, null, 2) + '\n');
}
