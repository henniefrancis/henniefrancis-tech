import { expect, test } from '@playwright/test';
import { loadRoutes } from '../lib/routes';
import { waitForSettled } from '../lib/stabilise';

/**
 * The script policy (a meta tag written by tools/csp) must let the site run:
 * the page carries one policy, no script is blocked, and both the application
 * bundle and the global Bootstrap script, which are added by the hashed
 * loader, have executed. One project is enough: the policy does not depend on
 * the device. Other directives (images, fonts, styles) come from the edge
 * header and are covered by the route checks when the preview runs with
 * E2E_CSP_ENFORCE=1.
 */
test.beforeEach(({}, info) => {
  test.skip(info.project.name !== 'desktop-1280', 'the script policy does not depend on the device');
});

declare global {
  interface Window {
    __cspViolations?: string[];
  }
}

for (const route of loadRoutes()) {
  test(`scripts run under the script policy on ${route}`, async ({ page }) => {
    await page.addInitScript(() => {
      window.__cspViolations = [];
      document.addEventListener('securitypolicyviolation', (e) => {
        window.__cspViolations?.push(`${e.violatedDirective}`);
      });
    });
    const response = await page.goto(route, { waitUntil: 'load' });
    expect(response?.status()).toBe(200);
    await waitForSettled(page);

    const policies = await page.$$eval('meta[http-equiv="Content-Security-Policy"]', (m) =>
      m.map((e) => e.getAttribute('content') ?? ''),
    );
    expect(policies).toHaveLength(1);
    expect(policies[0]).toContain("'strict-dynamic'");
    expect(policies[0]).toContain("object-src 'none'");
    // The served HTML has no external script tag; the loader adds them at run time.
    expect(await response?.text()).not.toMatch(/<script[^>]+\ssrc=/);

    const violations = await page.evaluate(() => window.__cspViolations ?? []);
    expect(violations.filter((v) => v.startsWith('script-src'))).toEqual([]);

    // Both scripts were added by the hashed loader: Bootstrap defines window.bootstrap and the
    // application bundle attaches its view data to the elements it hydrates.
    await page.waitForFunction(
      () =>
        typeof (window as unknown as { bootstrap?: unknown }).bootstrap === 'object' &&
        Array.from(document.querySelectorAll('app-root *')).some((e) => !!(e as unknown as { __ngContext__?: unknown }).__ngContext__),
      undefined,
      { timeout: 15_000 },
    );
    const late = await page.evaluate(() => window.__cspViolations ?? []);
    expect(late.filter((v) => v.startsWith('script-src'))).toEqual([]);
  });
}
