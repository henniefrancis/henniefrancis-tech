import { expect, test } from '@playwright/test';
import type { Snapshot } from './collect';
import { alignLines, applyApprovals, compareDocument, compareGeometry, compareText, locateRegion, pixelDiffs } from './compare';

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
  expect(compareText(['a', 'b'], ['a', 'c'])).toEqual([{ kind: 'text', text: 'c', detail: 'line 2 changed (1 -> 1 chars)' }]);
});

test('text diffs align lines, so an insertion or removal is one diff', () => {
  expect(compareText(['a', 'b'], ['a', 'x', 'b'])).toEqual([{ kind: 'text', text: 'x', detail: 'line 2 added (1 chars)' }]);
  expect(compareText(['a', 'x', 'b'], ['a', 'b'])).toEqual([{ kind: 'text', text: 'x', detail: 'line 2 removed (1 chars)' }]);
  expect(compareText(['a'], ['a', 'b'])[0].detail).toContain('added');
  expect(compareText(['a', 'b'], ['a'])[0].detail).toContain('removed');
  expect(compareText([], ['a'])).toHaveLength(1);
  expect(compareText(['a'], [])).toHaveLength(1);
  const mixed = compareText(['h', 'old', 'k', 'gone', 'z'], ['h', 'new', 'k', 'z', 'extra']);
  expect(mixed.map((d) => d.text)).toEqual(['new', 'gone', 'extra']);
  expect(compareText(['a', 'b', 'c', 'd'], ['a', 'q', 'r', 'c', 'd']).map((d) => d.text)).toEqual(['q', 'r']);
});

test('locateRegion finds the smallest element that contains the changed pixels', () => {
  const els = [
    { path: 'body[1]', box: { x: 0, y: 0, w: 100, h: 100 } },
    { path: 'body[1]/div[1]', box: { x: 10, y: 10, w: 50, h: 50 } },
    { path: 'body[1]/div[1]/p[1]', box: { x: 12, y: 12, w: 20, h: 10 } },
  ];
  expect(locateRegion({ x: 13, y: 13, w: 5, h: 5 }, els)).toBe('body[1]/div[1]/p[1]');
  expect(locateRegion({ x: 13, y: 13, w: 40, h: 5 }, els)).toBe('body[1]/div[1]');
  expect(locateRegion({ x: 5, y: 5, w: 40, h: 5 }, els)).toBe('body[1]');
  expect(locateRegion({ x: 500, y: 5, w: 4, h: 5 }, els)).toBe('body[1]');
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

test('a text region pixel diff carries the located path when bounds are known', () => {
  const base = { width: 10, height: 10, curWidth: 10, curHeight: 10, textRegionRatio: 0.01, imageRatios: [] };
  const bounds = { x: 1, y: 1, w: 2, h: 2 };
  expect(pixelDiffs({ ...base, textRegionBounds: bounds }, () => 'p[1]')[0].path).toBe('p[1]');
  expect(pixelDiffs({ ...base, textRegionBounds: bounds })[0].path).toBeUndefined();
  expect(pixelDiffs({ ...base, textRegionBounds: null }, () => 'p[1]')[0].path).toBeUndefined();
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
  expect(applyApprovals(diffs, '/r/deep/page', 'android', [{ ...rule, route: '/r/*' }]).approved).toHaveLength(1);
  expect(applyApprovals(diffs, '/r', 'android', [{ ...rule, route: '/r/*' }]).approved).toEqual([]);
  expect(applyApprovals(diffs, '/rx/y', 'android', [{ ...rule, route: '/r/*' }]).approved).toEqual([]);
});

test('approvals can be narrowed to exact text lines and to page diff details', () => {
  const text = { kind: 'text' as const, text: '4x AWS Certified', detail: 'line 5 changed' };
  const other = { kind: 'text' as const, text: 'Something else', detail: 'line 9 changed' };
  const noText = { kind: 'text' as const, detail: 'unlocalised' };
  const rule = { route: '/r', kinds: ['text' as const], texts: ['4x AWS Certified'], reason: 'r' };
  const result = applyApprovals([text, other, noText], '/r', 'android', [rule]);
  expect(result.approved).toEqual([text]);
  expect(result.unapproved).toEqual([other, noText]);
  const page = { kind: 'page' as const, detail: 'new bad response while loading: broken-image a/b.png' };
  const pageRule = { route: '/r', kinds: ['page' as const], detailContains: ['a/b.png'], reason: 'r' };
  expect(applyApprovals([page, { ...page, detail: 'document title differs' }], '/r', 'android', [pageRule]).approved).toEqual([page]);
});

test('text nodes are paired by their text for the style and box comparison', () => {
  const base = snap();
  const extra = { ...base.texts[0], text: 'new line', path: 'body[1]/p[0]' };
  const withExtra = snap({ texts: [extra, base.texts[0]] });
  expect(compareGeometry(base, withExtra)).toEqual([]);
  expect(compareGeometry(withExtra, base)).toEqual([]);
  const restyled = snap({ texts: [extra, { ...base.texts[0], style: { ...style, size: '30px' } }] });
  expect(compareGeometry(base, restyled)[0]).toMatchObject({ kind: 'style', path: 'body[1]/p[1]' });
});

test('alignLines pairs equal, changed, added and removed lines', () => {
  expect(alignLines(['a', 'b'], ['a', 'x', 'b']).map((p) => p.kind)).toEqual(['same', 'added', 'same']);
  expect(alignLines(['a', 'old'], ['a', 'new'])).toEqual([
    { kind: 'same', base: 0, cur: 0 },
    { kind: 'changed', base: 1, cur: 1 },
  ]);
  expect(alignLines(['a', 'b'], ['b']).map((p) => p.kind)).toEqual(['removed', 'same']);
});
