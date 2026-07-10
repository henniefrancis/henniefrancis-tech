import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration for henniefrancis.tech.
 *
 * - In CI: tests run against production (BASE_URL is set by the workflow)
 * - Locally: just `npm run test:e2e` — a static server for src/ is
 *   started automatically (webServer below) on http://localhost:8080
 */
const BASE_URL = process.env['BASE_URL'] ?? 'http://localhost:8080';
const IS_LOCAL = BASE_URL.includes('localhost');

export default defineConfig({
  // Auto-start a local static server when testing locally. CI sets
  // BASE_URL to the production URL, so no server is started there.
  webServer: IS_LOCAL
    ? {
        command: 'npx --yes serve src -l 8080',
        url: 'http://localhost:8080',
        reuseExistingServer: true,
        timeout: 60_000,
      }
    : undefined,
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Mobile pass — catches viewport regressions (horizontal scroll,
      // broken stacking) on every deploy and nightly run.
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
  ],
});
