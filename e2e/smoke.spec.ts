import { test, expect } from '@playwright/test';

/**
 * Smoke tests — fast sanity checks that the site is up, every page
 * renders, and the nginx/CloudFront layer behaves as configured
 * (clean URLs, security headers, real 404s).
 */

const PAGES: ReadonlyArray<{ path: string; title: RegExp }> = [
  { path: '/', title: /Hennie Francis/i },
  { path: '/pages/biography.html', title: /Biography/i },
  { path: '/pages/current-role.html', title: /Current Role/i },
  { path: '/pages/certifications.html', title: /Certifications/i },
  { path: '/pages/portfolio.html', title: /Portfolio/i },
  { path: '/pages/public-speaking.html', title: /Public Speaking/i },
  { path: '/pages/blog.html', title: /Blog/i },
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

// These assertions test the nginx/CloudFront layer (security headers,
// cache policy, clean URLs), which a plain local static server doesn't
// implement — they only run against a deployed environment.
const IS_LOCAL = (process.env['BASE_URL'] ?? 'http://localhost:8080').includes('localhost');

test.describe('Edge/nginx behaviour', () => {
  test.skip(IS_LOCAL, 'nginx/CloudFront behaviour — deployed environments only');

  test('clean URLs resolve via try_files ($uri.html fallback)', async ({ request }) => {
    const response = await request.get('/pages/biography');
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain('Biography');
  });

  test('unknown paths return the styled 404 page (real 404 status)', async ({ request }) => {
    const response = await request.get('/definitely-not-a-page-12345');
    expect(response.status()).toBe(404);
    // nginx error_page must serve OUR page, not the stock nginx one
    const body = await response.text();
    expect(body).toContain('Page Not Found');
    expect(body).toContain('root@hennie');
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
