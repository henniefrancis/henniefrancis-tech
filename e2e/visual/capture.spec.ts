import { join } from 'node:path';
import { test } from '@playwright/test';
import { capturePage, writeCapture } from '../lib/capture';
import { VISUAL_DIR, loadRoutes, routeSlug } from '../lib/routes';

/**
 * Baseline capture. Run against the LIVE site before anything changes:
 *   BASE_URL=https://henniefrancis.tech npx playwright test --grep @capture
 * Output: e2e/visual/baseline/{project}/{slug}/ (gitignored).
 * Read-only: GET requests only.
 */
const OUT = process.env['BASELINE_DIR'] ?? join(VISUAL_DIR, 'baseline');

test.describe('baseline capture', { tag: '@capture' }, () => {
  for (const route of loadRoutes()) {
    test(`capture ${route}`, async ({ page }, info) => {
      const captured = await capturePage(page, route);
      writeCapture(join(OUT, info.project.name, routeSlug(route)), captured);
      info.annotations.push({ type: 'status', description: String(captured.meta.status) });
      // Bad responses are recorded in meta.json (live defects are part of the baseline);
      // make-manifest.mjs lists them so transient failures can be told apart.
    });
  }
});
