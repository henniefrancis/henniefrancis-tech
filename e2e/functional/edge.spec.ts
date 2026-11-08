import { expect, test } from '@playwright/test';

/**
 * Behaviour of the serving layer. Runs against the local preview
 * (which mirrors nginx and sends the edge headers) and, with EXPECT_EDGE=1,
 * against a deployed BASE_URL. One project is enough: these are not layout tests.
 */
test.beforeEach(({}, info) => {
  test.skip(info.project.name !== 'desktop-1280', 'serving-layer check, one project is enough');
  test.skip(!!process.env['BASE_URL'] && !process.env['EXPECT_EDGE'], 'set EXPECT_EDGE=1 to check a deployed site');
});

test('a deep route is prerendered (real HTML, not just an SPA shell)', async ({ request }) => {
  const response = await request.get('/biography');
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain('Biography');
});

test('security headers are present', async ({ request }) => {
  const headers = (await request.get('/')).headers();
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBe('SAMEORIGIN');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
});

test('HTML is served no-cache so deploys land instantly', async ({ request }) => {
  expect((await request.get('/')).headers()['cache-control']).toContain('no-cache');
});

test('legacy and non-canonical URLs get a 301 to the canonical one', async ({ request }) => {
  for (const [from, to] of [
    ['/biography/', '/biography'],
    ['/biography.html', '/biography'],
    ['/pages/biography.html', '/biography'],
  ]) {
    const res = await request.get(from, { maxRedirects: 0 });
    expect(res.status(), from).toBe(301);
    expect(new URL(res.headers()['location'], 'http://x').pathname).toBe(to);
  }
});

test('an unknown path returns a 404 status with a page', async ({ request }) => {
  const res = await request.get('/this-page-does-not-exist');
  expect(res.status()).toBe(404);
});
