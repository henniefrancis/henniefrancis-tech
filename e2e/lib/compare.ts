import type { Box, Snapshot } from './collect';

/** Geometry tolerance in CSS pixels (exact within 1 px rounding). */
export const GEOMETRY_TOLERANCE_PX = 1;
/** Max share of differing pixels inside one image box (WebP and resize noise). */
export const IMAGE_BOX_MAX_RATIO = 0.02;
/** Max share of differing pixels outside every image box (text regions are strict). */
export const TEXT_REGION_MAX_RATIO = 0;

export type DiffKind = 'text' | 'geometry' | 'style' | 'pixels' | 'page';

export interface Diff {
  kind: DiffKind;
  /** Short, value-free description. Never contains personal data beyond what is on the public page. */
  detail: string;
  path?: string;
  /** Text diffs: the line that was added or changed (its new text), or removed (its old text). */
  text?: string;
}

export interface ApprovedDiff {
  /** Route this entry applies to, "*" for every route, or a prefix ending in "/*" (for example "/events/*"). */
  route: string;
  /** Diff kinds covered. */
  kinds: DiffKind[];
  /** Optional: only diffs whose element path contains this substring. */
  pathContains?: string;
  /** Optional: only diffs whose element path (or, for pixel regions, the smallest element containing the change) contains this substring. */
  /** Optional (text diffs): only added, changed or removed lines whose text is exactly one of these. */
  texts?: string[];
  /** Optional (page diffs): only diffs whose detail contains one of these substrings. */
  detailContains?: string[];
  /** Optional: only these projects. */
  projects?: string[];
  reason: string;
}

const boxDelta = (a: Box, b: Box) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.w - b.w), Math.abs(a.h - b.h));

export interface LinePair {
  kind: 'same' | 'changed' | 'added' | 'removed';
  /** Index in the baseline lines (absent for an added line). */
  base?: number;
  /** Index in the current lines (absent for a removed line). */
  cur?: number;
}

/**
 * Aligns two lists of lines (longest common subsequence), so one inserted line is one difference instead
 * of a shift of every later line. A removed and an added line at the same spot pair up as "changed".
 */
export function alignLines(base: string[], cur: string[]): LinePair[] {
  const n = base.length;
  const m = cur.length;
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = base[i] === cur[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const out: LinePair[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && base[i] === cur[j]) {
      out.push({ kind: 'same', base: i++, cur: j++ });
    } else if (i < n && j < m && lcs[i + 1][j + 1] >= Math.max(lcs[i + 1][j], lcs[i][j + 1])) {
      out.push({ kind: 'changed', base: i++, cur: j++ });
    } else if (j < m && (i >= n || lcs[i][j + 1] >= lcs[i + 1][j])) {
      out.push({ kind: 'added', cur: j++ });
    } else {
      out.push({ kind: 'removed', base: i++ });
    }
  }
  return out;
}

/** Exact comparison of the normalised visible text lines. */
export function compareText(base: string[], cur: string[]): Diff[] {
  const out: Diff[] = [];
  for (const p of alignLines(base, cur)) {
    if (p.kind === 'changed') {
      out.push({ kind: 'text', text: cur[p.cur!], detail: `line ${p.cur! + 1} changed (${base[p.base!].length} -> ${cur[p.cur!].length} chars)` });
    } else if (p.kind === 'added') {
      out.push({ kind: 'text', text: cur[p.cur!], detail: `line ${p.cur! + 1} added (${cur[p.cur!].length} chars)` });
    } else if (p.kind === 'removed') {
      out.push({ kind: 'text', text: base[p.base!], detail: `line ${p.base! + 1} removed (${base[p.base!].length} chars)` });
    }
  }
  return out;
}

/** Element boxes within tolerance, and text-node computed style exact. */
export function compareGeometry(base: Snapshot, cur: Snapshot, tolerance = GEOMETRY_TOLERANCE_PX): Diff[] {
  const out: Diff[] = [];
  const curByPath = new Map(cur.elements.map((e) => [e.path, e]));
  const baseByPath = new Map(base.elements.map((e) => [e.path, e]));
  for (const b of base.elements) {
    const c = curByPath.get(b.path);
    if (!c) {
      out.push({ kind: 'geometry', path: b.path, detail: `element missing (was <${b.tag}>)` });
      continue;
    }
    if (c.tag !== b.tag) {
      out.push({ kind: 'geometry', path: b.path, detail: `tag <${b.tag}> -> <${c.tag}>` });
      continue;
    }
    const d = boxDelta(b.box, c.box);
    if (d > tolerance) {
      out.push({
        kind: 'geometry',
        path: b.path,
        detail: `box moved or resized by ${d.toFixed(2)}px (${fmt(b.box)} -> ${fmt(c.box)})`,
      });
    }
  }
  for (const c of cur.elements) {
    if (!baseByPath.has(c.path)) out.push({ kind: 'geometry', path: c.path, detail: `new element <${c.tag}>` });
  }
  // Text nodes are paired by their text, so an added or removed line does not shift every later comparison.
  for (const pair of alignLines(base.texts.map((t) => t.text), cur.texts.map((t) => t.text))) {
    if (pair.kind === 'added' || pair.kind === 'removed') continue;
    const b = base.texts[pair.base!];
    const c = cur.texts[pair.cur!];
    const keys = Object.keys(b.style) as (keyof typeof b.style)[];
    const changed = keys.filter((k) => b.style[k] !== c.style[k]);
    if (changed.length > 0) {
      out.push({ kind: 'style', path: b.path, detail: `text style changed: ${changed.join(', ')}` });
    }
    if (b.text === c.text && boxDelta(b.box, c.box) > tolerance) {
      out.push({ kind: 'geometry', path: b.path, detail: `text box moved or resized by ${boxDelta(b.box, c.box).toFixed(2)}px` });
    }
  }
  return out;
}

export function compareDocument(base: Snapshot, cur: Snapshot): Diff[] {
  const out: Diff[] = [];
  if (base.doc.title !== cur.doc.title) out.push({ kind: 'page', detail: 'document title differs' });
  if (cur.doc.scrollWidth > cur.doc.clientWidth && base.doc.scrollWidth <= base.doc.clientWidth) {
    out.push({ kind: 'page', detail: 'new horizontal scroll' });
  }
  return out;
}

export interface PixelResult {
  width: number;
  height: number;
  curWidth: number;
  curHeight: number;
  textRegionRatio: number;
  /** Bounding box of every differing pixel outside the image boxes, or null when none differ. */
  textRegionBounds?: Box | null;
  imageRatios: { path: string; ratio: number }[];
}

/**
 * Path of the smallest element whose box contains the region (1 px slack), so a pixel difference can be
 * approved for one part of the page. Falls back to the body.
 */
export function locateRegion(region: Box, elements: { path: string; box: Box }[]): string {
  const slack = 1;
  let best: { path: string; area: number } | undefined;
  for (const e of elements) {
    const b = e.box;
    const contains = b.x - slack <= region.x && b.y - slack <= region.y && b.x + b.w + slack >= region.x + region.w && b.y + b.h + slack >= region.y + region.h;
    const area = b.w * b.h;
    if (contains && (!best || area < best.area)) best = { path: e.path, area };
  }
  return best?.path ?? 'body[1]';
}

export function pixelDiffs(result: PixelResult, locate?: (region: Box) => string): Diff[] {
  const out: Diff[] = [];
  if (result.width !== result.curWidth || result.height !== result.curHeight) {
    out.push({
      kind: 'pixels',
      detail: `screenshot size ${result.width}x${result.height} -> ${result.curWidth}x${result.curHeight}`,
    });
  }
  if (result.textRegionRatio > TEXT_REGION_MAX_RATIO) {
    const bounds = result.textRegionBounds;
    out.push({
      kind: 'pixels',
      ...(bounds && locate ? { path: locate(bounds) } : {}),
      detail: `text region differs in ${(result.textRegionRatio * 100).toFixed(4)}% of pixels (max ${TEXT_REGION_MAX_RATIO * 100}%)`,
    });
  }
  for (const im of result.imageRatios) {
    if (im.ratio > IMAGE_BOX_MAX_RATIO) {
      out.push({
        kind: 'pixels',
        path: im.path,
        detail: `image box differs in ${(im.ratio * 100).toFixed(2)}% of pixels (max ${IMAGE_BOX_MAX_RATIO * 100}%)`,
      });
    }
  }
  return out;
}

/** Splits diffs into approved (matched by an approved-diffs entry) and unapproved. */
export function applyApprovals(
  diffs: Diff[],
  route: string,
  project: string,
  approved: ApprovedDiff[],
): { approved: Diff[]; unapproved: Diff[] } {
  const ok: Diff[] = [];
  const bad: Diff[] = [];
  for (const d of diffs) {
    const hit = approved.some(
      (a) =>
        routeMatches(a.route, route) &&
        a.kinds.includes(d.kind) &&
        (!a.projects || a.projects.includes(project)) &&
        (!a.pathContains || (d.path ?? '').includes(a.pathContains)) &&
        (!a.texts || (d.text !== undefined && a.texts.includes(d.text))) &&
        (!a.detailContains || a.detailContains.some((s) => d.detail.includes(s))),
    );
    (hit ? ok : bad).push(d);
  }
  return { approved: ok, unapproved: bad };
}

function routeMatches(pattern: string, route: string): boolean {
  if (pattern === '*' || pattern === route) return true;
  return pattern.endsWith('/*') && route.startsWith(pattern.slice(0, -1));
}

function fmt(b: Box): string {
  return `${b.x},${b.y} ${b.w}x${b.h}`;
}
