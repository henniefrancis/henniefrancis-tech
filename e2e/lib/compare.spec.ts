import { expect, test } from '@playwright/test';
import type { Snapshot } from './collect';
import { applyApprovals, compareDocument, compareGeometry, compareText, pixelDiffs } from './compare';

// Pure logic tests for the compare helpers. Run in one project only.
test.beforeEach(({}, info) => {
  test.skip(info.project.name !== 'desktop-1280', 'logic test, one project is enough');
});

const style = { family: 'a', size: '16px', weight: '400', fontStyle: 'normal', color: 'rgb(0, 0, 0)', lineHeight: '24px', letterSpacing: 'normal' };
const snap = (over: Partial<Snapshot> = {}): Snapshot => ({
  elements: [
    { path: 'body[1]', tag: 'body', box: { x: 0, y: 0, w: 100, h: 100 } },
    { path: 'body[1]/p[1]', tag: 'p', box: { x: 10, y: 10, w: 50, h: 20 } },
  ],
  texts: [{ path: 'body[1]/p[1]', text: 'hi', box: { x: 10, y: 10, w: 20, h: 20 }, style }],
  images: [],
  doc: { scrollWidth: 100, scrollHeight: 100, clientWidth: 100, title: 'T' },
  ...over,
});

test('text is exact', () => {
  expect(compareText(['a', 'b'], ['a', 'b'])).toEqual([]);
  expect(compareText(['a', 'b'], ['a', 'c'])).toHaveLength(1);
  expect(compareText(['a'], ['a', 'b'])[0].detail).toContain('count');
});

test('geometry tolerates 1px and flags more', () => {
  const base = snap();
  const near = snap({ elements: [base.elements[0], { ...base.elements[1], box: { x: 10.9, y: 10, w: 50, h: 20 } }] });
  const far = snap({ elements: [base.elements[0], { ...base.elements[1], box: { x: 12.5, y: 10, w: 50, h: 20 } }] });
  expect(compareGeometry(base, near)).toEqual([]);
  expect(compareGeometry(base, far)).toHaveLength(1);
});

test('geometry flags missing, new and retagged elements and style changes', () => {
  const base = snap();
  const missing = snap({ elements: [base.elements[0]] });
  expect(compareGeometry(base, missing)[0].detail).toContain('missing');
  expect(compareGeometry(missing, base)[0].detail).toContain('new element');
  const retag = snap({ elements: [base.elements[0], { ...base.elements[1], tag: 'span' }] });
  expect(compareGeometry(base, retag)[0].detail).toContain('tag');
  const styled = snap({ texts: [{ ...base.texts[0], style: { ...style, color: 'red' } }] });
  expect(compareGeometry(base, styled)[0]).toMatchObject({ kind: 'style' });
  const moved = snap({ texts: [{ ...base.texts[0], box: { x: 30, y: 10, w: 20, h: 20 } }] });
  expect(compareGeometry(base, moved)[0].detail).toContain('text box');
});

test('document checks title and new horizontal scroll', () => {
  expect(compareDocument(snap(), snap())).toEqual([]);
  expect(compareDocument(snap(), snap({ doc: { scrollWidth: 100, scrollHeight: 1, clientWidth: 100, title: 'U' } }))).toHaveLength(1);
  expect(compareDocument(snap(), snap({ doc: { scrollWidth: 300, scrollHeight: 1, clientWidth: 100, title: 'T' } }))[0].detail).toContain('horizontal');
});

test('pixel thresholds: strict text region, 2% image boxes, size mismatch', () => {
  const ok = { width: 10, height: 10, curWidth: 10, curHeight: 10, textRegionRatio: 0, imageRatios: [{ path: 'i', ratio: 0.019 }] };
  expect(pixelDiffs(ok)).toEqual([]);
  expect(pixelDiffs({ ...ok, textRegionRatio: 0.0001 })).toHaveLength(1);
  expect(pixelDiffs({ ...ok, imageRatios: [{ path: 'i', ratio: 0.03 }] })).toHaveLength(1);
  expect(pixelDiffs({ ...ok, curHeight: 11 })).toHaveLength(1);
});

test('approvals match by route, kind, project and path', () => {
  const diffs = [
    { kind: 'geometry' as const, path: 'body[1]/a[1]', detail: 'x' },
    { kind: 'text' as const, detail: 'y' },
  ];
  const rule = { route: '/r', kinds: ['geometry' as const], reason: 'r' };
  expect(applyApprovals(diffs, '/r', 'android', [rule])).toEqual({ approved: [diffs[0]], unapproved: [diffs[1]] });
  expect(applyApprovals(diffs, '/other', 'android', [rule]).approved).toEqual([]);
  expect(applyApprovals(diffs, '/r', 'android', [{ ...rule, projects: ['ipad-portrait'] }]).approved).toEqual([]);
  expect(applyApprovals(diffs, '/r', 'android', [{ ...rule, pathContains: 'a[1]' }]).approved).toHaveLength(1);
  expect(applyApprovals(diffs, '/r', 'android', [{ ...rule, pathContains: 'zzz' }]).approved).toEqual([]);
  expect(applyApprovals(diffs, '/x', 'android', [{ ...rule, route: '*' }]).approved).toHaveLength(1);
});
