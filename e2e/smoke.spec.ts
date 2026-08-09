import { test, expect } from '@playwright/test';

/**
 * Smoke tests — fast sanity checks that every route renders, prerendered
 * HTML is served (not just an SPA shell), and the nginx/CloudFront layer
 * behaves (security headers, no-cache HTML).
 */

const PAGES: ReadonlyArray<{ path: string; title: RegExp }> = [
  { path: '/', title: /Hennie Francis/i },
  { path: '/biography', title: /Biography/i },
  { path: '/current-role', title: /Current Role/i },
  { path: '/portfolio', title: /Portfolio/i },
  { path: '/social-media', title: /Social Media/i },
  { path: '/public-speaking', title: /Public Speaking/i },
  { path: '/blog', title: /Blog/i },
  { path: '/tech-stack', title: /Tech Stack/i },
  { path: '/certifications', title: /Certifications/i },
  { path: '/special-awards', title: /Special Awards/i },
];

test.describe('Smoke tests', () => {
  for (const { path, title } of PAGES) {
    test(`${path} renders with the right title`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle(title);
      await expect(page.locator('body')).toBeVisible();
    });
  }

  test('home page loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(errors, `Console errors: ${errors.join('\n')}`).toHaveLength(0);
  });
});

test.describe('Mobile rendering', () => {
  for (const { path } of PAGES) {
    test(`${path} has no horizontal overflow`, async ({ page }) => {
      await page.goto(path);
      const { scrollW, clientW } = await page.evaluate(() => ({
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
      }));
      expect(scrollW, 'page must not scroll horizontally').toBeLessThanOrEqual(clientW);
    });
  }
});

// These assertions test the nginx/CloudFront layer (security headers, cache
// policy) and prerendering, which a plain local static server doesn't fully
// implement — they only run against a deployed environment.
const IS_LOCAL = (process.env['BASE_URL'] ?? 'http://localhost:8080').includes('localhost');

test.describe('Edge/nginx behaviour', () => {
  test.skip(IS_LOCAL, 'nginx/CloudFront behaviour — deployed environments only');

  test('a deep route is prerendered (real HTML, not just an SPA shell)', async ({ request }) => {
    const response = await request.get('/biography');
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain('Biography');
  });

  test('security headers are present', async ({ request }) => {
    const response = await request.get('/');
    const headers = response.headers();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  test('HTML is served no-cache so deploys land instantly', async ({ request }) => {
    const response = await request.get('/');
    expect(response.headers()['cache-control']).toContain('no-cache');
  });
});
