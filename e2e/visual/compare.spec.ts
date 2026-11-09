import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { capturePage, writeCapture } from '../lib/capture';
import type { Snapshot } from '../lib/collect';
import { applyApprovals, compareDocument, compareGeometry, compareText, locateRegion, pixelDiffs } from '../lib/compare';
import type { ApprovedDiff, Diff } from '../lib/compare';
import { diffPngs } from '../lib/pixeldiff';
import { VISUAL_DIR, loadRoutes, routeSlug } from '../lib/routes';

/**
 * Compare the current site (local preview by default, or BASE_URL) with
 * the baseline captures of the live site. Text is exact, geometry is exact within
 * 1 px, text-region pixels are strict, image boxes allow 2% differing pixels.
 * Any diff not listed in approved-diffs.json fails the test.
 *   npm run test:visual   (playwright test --grep @visual)
 */
const BASELINE = process.env['BASELINE_DIR'] ?? join(VISUAL_DIR, 'baseline');
const CURRENT = join(VISUAL_DIR, 'current');
const approved = (JSON.parse(readFileSync(join(VISUAL_DIR, 'approved-diffs.json'), 'utf8')) as { approved: ApprovedDiff[] })
  .approved;

test.describe('visual compare against live baseline', { tag: '@visual' }, () => {
  for (const route of loadRoutes()) {
    test(`compare ${route}`, async ({ page }, info) => {
      const project = info.project.name;
      const baseDir = join(BASELINE, project, routeSlug(route));
      expect(existsSync(join(baseDir, 'page.png')), `baseline missing for ${project} ${route}`).toBe(true);

      const cur = await capturePage(page, route);
      writeCapture(join(CURRENT, project, routeSlug(route)), cur);

      const baseSnap = JSON.parse(readFileSync(join(baseDir, 'geometry.json'), 'utf8')) as Snapshot;
      const baseText = readFileSync(join(baseDir, 'text.txt'), 'utf8').replace(/\n$/, '').split('\n');
      const baseMeta = JSON.parse(readFileSync(join(baseDir, 'meta.json'), 'utf8')) as { status: number; badResponses?: string[] };

      const diffs: Diff[] = [];
      if (cur.meta.status !== baseMeta.status) {
        diffs.push({ kind: 'page', detail: `HTTP status ${baseMeta.status} -> ${cur.meta.status}` });
      }
      const baseBad = new Set((baseMeta as { badResponses?: string[] }).badResponses ?? []);
      for (const bad of cur.meta.badResponses) {
        if (!baseBad.has(bad)) diffs.push({ kind: 'page', detail: `new bad response while loading: ${bad}` });
      }
      diffs.push(...compareText(baseText, cur.textLines));
      diffs.push(...compareGeometry(baseSnap, cur.snapshot));
      diffs.push(...compareDocument(baseSnap, cur.snapshot));
      const px = await diffPngs(
        page,
        readFileSync(join(baseDir, 'page.png')),
        cur.png,
        [...baseSnap.images, ...cur.snapshot.images],
      );
      diffs.push(...pixelDiffs(px, (region) => locateRegion(region, [...cur.snapshot.elements, ...baseSnap.elements])));

      const { approved: ok, unapproved } = applyApprovals(diffs, route, project, approved);
      mkdirSync(join(CURRENT, project, routeSlug(route)), { recursive: true });
      writeFileSync(
        join(CURRENT, project, routeSlug(route), 'diff.json'),
        JSON.stringify({ route, project, unapproved, approved: ok }, null, 2) + '\n',
      );
      for (const d of ok) info.annotations.push({ type: 'approved-diff', description: `${d.kind}: ${d.detail}` });

      const shown = unapproved.slice(0, 15).map((d) => `${d.kind} ${d.path ?? ''} ${d.detail}`);
      expect(unapproved, `${unapproved.length} unapproved diffs:\n${shown.join('\n')}`).toEqual([]);
    });
  }
});
