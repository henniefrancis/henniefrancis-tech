import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { badLabel } from '../lib/capture';
import { VISUAL_DIR, loadRoutes, routeSlug } from '../lib/routes';
import { waitForSettled } from '../lib/stabilise';

/**
 * Every generated route renders, has a title, does not scroll
 * horizontally, logs no console errors or CSP violations, and loads every
 * resource. Resource failures are allowed only when the live-site baseline
 * already had the same failure (for example the certificate images) or the
 * failure is listed in e2e/known-issues.json (badges not uploaded yet).
 * Still to add: h1, canonical and description, the link
 * checker over dist, and the production-only header and redirect checks.
 */
const BASELINE = process.env['BASELINE_DIR'] ?? join(VISUAL_DIR, 'baseline');
const known = (
  JSON.parse(readFileSync(join(__dirname, '..', 'known-issues.json'), 'utf8')) as {
    missingResources: { route: string; contains: string }[];
  }
).missingResources;

function baselineBad(project: string, route: string): string[] {
  const file = join(BASELINE, project, routeSlug(route), 'meta.json');
  if (!existsSync(file)) return [];
  return (JSON.parse(readFileSync(file, 'utf8')) as { badResponses?: string[] }).badResponses ?? [];
}

for (const route of loadRoutes()) {
  test(`route ${route} renders cleanly`, async ({ page }, info) => {
    const allowed = (label: string): boolean =>
      baselineBad(info.project.name, route).includes(label) ||
      known.some((k) => k.route === route && label.includes(k.contains));
    const problems: string[] = [];
    const bad: { what: string; url: string }[] = [];
    page.on('console', (m) => {
      // Resource failures are checked through the response events below.
      if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) {
        problems.push(`console error: ${m.text().slice(0, 200)}`);
      }
    });
    page.on('pageerror', (e) => problems.push(`page error: ${e.message.slice(0, 200)}`));
    page.on('response', (r) => {
      if (r.status() >= 400) bad.push({ what: String(r.status()), url: r.url() });
    });
    page.on('requestfailed', (r) => {
      if (r.failure()?.errorText !== 'net::ERR_ABORTED') bad.push({ what: 'failed', url: r.url() });
    });
    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', (e) => {
        console.error(`csp violation: ${e.violatedDirective}`);
      });
    });
    const response = await page.goto(route, { waitUntil: 'load' });
    expect(response?.status()).toBe(200);
    await waitForSettled(page);
    const origin = new URL(page.url()).origin;
    const broken = await page.evaluate(() =>
      Array.from(document.images)
        .filter((i) => i.complete && i.naturalWidth === 0)
        .map((i) => new URL(i.currentSrc || i.src, location.href).pathname.split('/').slice(-2).join('/')),
    );
    for (const b of bad) {
      const label = badLabel(b.what, b.url, origin);
      if (!allowed(label)) problems.push(`unexpected bad response: ${label}`);
    }
    for (const b of broken) {
      if (!allowed(`broken-image ${b}`)) problems.push(`unexpected broken image: ${b}`);
    }
    expect(await page.title()).not.toBe('');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, 'horizontal scroll').toBeLessThanOrEqual(0);
    expect(problems).toEqual([]);
  });
}
