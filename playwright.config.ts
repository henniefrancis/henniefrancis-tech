import { defineConfig } from '@playwright/test';
import { PROJECTS } from './e2e/lib/devices';

/**
 * Playwright configuration for henniefrancis.tech (device matrix).
 *
 * - BASE_URL: test an already running site (for example production). When it
 *   is unset, the local preview server (tools/preview) is started on
 *   E2E_PORT and serves the production build in dist.
 * - E2E_PORT: preview port. Defaults to 4280. Ports 4200 and 4210 are used by
 *   other tools and must not be chosen.
 * - EXPECT_EDGE=1: with BASE_URL set, also run the edge header checks (production after cutover).
 * - E2E_CSP_ENFORCE=1: the local preview also sends the enforced Content-Security-Policy header (the policy the
 *   edge carries). Images come from the site origin, so use it together with E2E_IMG_DIR.
 * - E2E_DIST: directory the preview serves (default: the Angular browser output).
 * - E2E_IMG_DIR: serve /img/* from this directory (layout <id>/<width>.webp) instead of the site image store.
 * - Suites are selected with tags: `--grep @visual`, `--grep @capture`, and
 *   `--grep-invert "@visual|@capture"` for the functional suite.
 * - Retries are 0 on purpose: a flaky test is fixed, never retried.
 */
const FORBIDDEN_PORTS = new Set([4200, 4210]);
const port = Number(process.env['E2E_PORT'] ?? '4280');
if (!Number.isInteger(port) || port < 1024 || port > 65535 || FORBIDDEN_PORTS.has(port)) {
  throw new Error(`E2E_PORT must be an integer in 1024-65535 and not 4200 or 4210 (got "${process.env['E2E_PORT']}")`);
}

const externalBase = process.env['BASE_URL'];
const baseURL = externalBase ?? `http://127.0.0.1:${port}`;
// Angular workspace at the repo root, so the build lands in dist/.
const dist = process.env['E2E_DIST'] ?? 'dist/henniefrancis-tech/browser';
const imgDir = process.env['E2E_IMG_DIR'];
const imgArg = imgDir ? ` --img-dir "${imgDir}"` : '';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  workers: process.env['E2E_WORKERS'] ? Number(process.env['E2E_WORKERS']) : undefined,
  timeout: 120_000,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e/report' }]],
  outputDir: 'e2e/test-results',
  webServer: externalBase
    ? undefined
    : {
        command: `node tools/preview/src/cli.mjs --dir "${dist}" --port ${port} --host 127.0.0.1 --edge-headers${imgArg}${process.env['E2E_CSP_ENFORCE'] ? ' --csp-enforce' : ''}`,
        url: `http://127.0.0.1:${port}/`,
        reuseExistingServer: false,
        timeout: 30_000,
        stdout: 'ignore',
        stderr: 'pipe',
      },
  use: {
    baseURL,
    trace: 'off',
    screenshot: 'off',
  },
  projects: PROJECTS,
});
