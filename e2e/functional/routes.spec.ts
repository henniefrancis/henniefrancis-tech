import { expect, test } from '@playwright/test';
import { loadRoutes } from '../lib/routes';
import { waitForSettled } from '../lib/stabilise';

/**
 * E5 (part): every generated route renders, has a title, does not scroll
 * horizontally and logs no console errors or CSP violations.
 * Still to add: h1, canonical and description (once the pages have them), the link
 * checker over dist, and the production-only header and redirect checks.
 */
for (const route of loadRoutes()) {
  test(`route ${route} renders cleanly`, async ({ page }) => {
    const problems: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') problems.push(`console error: ${m.text().slice(0, 200)}`);
    });
    page.on('pageerror', (e) => problems.push(`page error: ${e.message.slice(0, 200)}`));
    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', (e) => {
        console.error(`csp violation: ${e.violatedDirective}`);
      });
    });
    const response = await page.goto(route, { waitUntil: 'load' });
    expect(response?.status()).toBe(200);
    await waitForSettled(page);
    expect(await page.title()).not.toBe('');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, 'horizontal scroll').toBeLessThanOrEqual(0);
    expect(problems).toEqual([]);
  });
}
