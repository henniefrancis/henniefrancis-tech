import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { loadRoutes } from '../lib/routes';
import { waitForSettled } from '../lib/stabilise';

/**
 * Zero-violation proof for the edge content security policy.
 *
 * Every content route plus a 404 is loaded with the policy header applied next to the page meta policy, and the
 * test fails on any securitypolicyviolation event (enforced or report-only: the event fires for both), on any
 * console message that is a CSP message, and on a page error. It also checks that the policy header is really on the
 * page response, so a run without the header cannot pass by accident.
 *
 * Where the header comes from:
 *   - local: the preview server, started with E2E_CSP_ENFORCE=1 (enforced header, the production policy without
 *     upgrade-insecure-requests, which the plain http preview must leave out);
 *   - production: BASE_URL=https://henniefrancis.tech, with the header sent by CloudFront either as
 *     Content-Security-Policy (enforce, the whole policy) or as Content-Security-Policy-Report-Only (report-only,
 *     the policy without upgrade-insecure-requests: the W3C specification says the directive is ignored there and
 *     Chromium logs a console warning for it).
 * The expected text is read from the same file Terraform uses (terraform/csp/content-security-policy.txt).
 */
const POLICY = readFileSync(join(__dirname, '..', '..', 'terraform', 'csp', 'content-security-policy.txt'), 'utf8')
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l !== '');
// Enforced header: the whole policy. Report-only header: the policy without upgrade-insecure-requests, which
// browsers ignore (and warn about) in a report-only header. The local preview serves the plain http site, so it
// sends the report-only text in the enforced header.
const ENFORCED = POLICY.join('; ');
const REPORT_ONLY = POLICY.filter((d) => d !== 'upgrade-insecure-requests').join('; ');
const REMOTE = Boolean(process.env['BASE_URL']);
const ENFORCED_LOCAL = Boolean(process.env['E2E_CSP_ENFORCE']);
const CSP_CONSOLE = /content security policy|\[report only\]|refused to (load|apply|execute|connect|frame|create|run)/i;

declare global {
  interface Window {
    __cspEvents?: string[];
  }
}

test.beforeAll(() => {
  if (!REMOTE && !ENFORCED_LOCAL) {
    throw new Error('Run this suite with E2E_CSP_ENFORCE=1 (local preview) or BASE_URL (production): without the header it proves nothing.');
  }
});

const targets = [...loadRoutes(), '/csp-check-no-such-page'];

for (const route of targets) {
  test(`no policy violations on ${route}`, async ({ page }) => {
    const problems: string[] = [];
    page.on('console', (m) => {
      if (CSP_CONSOLE.test(m.text())) problems.push(`console: ${m.text().slice(0, 240)}`);
    });
    page.on('pageerror', (e) => problems.push(`page error: ${e.message.slice(0, 200)}`));
    await page.addInitScript(() => {
      window.__cspEvents = [];
      document.addEventListener('securitypolicyviolation', (e) => {
        window.__cspEvents?.push(`${e.disposition} ${e.violatedDirective} ${e.blockedURI.slice(0, 120)}`);
      });
    });

    const response = await page.goto(route, { waitUntil: 'load' });
    const is404 = route === '/csp-check-no-such-page';
    expect(response?.status()).toBe(is404 ? 404 : 200);

    // The header is on the page response.
    const headers = response?.headers() ?? {};
    if (REMOTE) {
      const enforced = headers['content-security-policy'];
      const reportOnly = headers['content-security-policy-report-only'];
      expect(enforced !== undefined || reportOnly !== undefined, 'policy header on the page response').toBe(true);
      if (enforced !== undefined) expect(enforced, 'Content-Security-Policy').toBe(ENFORCED);
      if (reportOnly !== undefined) expect(reportOnly, 'Content-Security-Policy-Report-Only').toBe(REPORT_ONLY);
    } else {
      expect(headers['content-security-policy']).toBe(REPORT_ONLY);
    }
    // The page meta policy applies as well (both policies are enforced together).
    expect(await page.locator('meta[http-equiv="Content-Security-Policy"]').count()).toBe(1);

    await waitForSettled(page);
    // Walk down the page so lazy images and late styles are requested before the check.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += Math.max(300, window.innerHeight / 2)) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 40));
      }
      window.scrollTo(0, 0);
    });
    await waitForSettled(page);

    const events = await page.evaluate(() => window.__cspEvents ?? []);
    expect(events, 'securitypolicyviolation events').toEqual([]);
    expect(problems).toEqual([]);
  });
}
