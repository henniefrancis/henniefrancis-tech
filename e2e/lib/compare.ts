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
}

export interface ApprovedDiff {
  /** Route this entry applies to, or "*" for every route. */
  route: string;
  /** Diff kinds covered. */
  kinds: DiffKind[];
  /** Optional: only diffs whose element path contains this substring. */
  pathContains?: string;
  /** Optional: only these projects. */
  projects?: string[];
  reason: string;
}

const boxDelta = (a: Box, b: Box) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.w - b.w), Math.abs(a.h - b.h));

/** Exact comparison of the normalised visible text lines. */
export function compareText(base: string[], cur: string[]): Diff[] {
  const out: Diff[] = [];
  if (base.length !== cur.length) {
    out.push({ kind: 'text', detail: `text node count ${base.length} -> ${cur.length}` });
  }
  const n = Math.min(base.length, cur.length);
  for (let i = 0; i < n; i++) {
    if (base[i] !== cur[i]) {
      out.push({ kind: 'text', detail: `line ${i + 1} differs (${base[i].length} -> ${cur[i].length} chars)` });
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
  const n = Math.min(base.texts.length, cur.texts.length);
  for (let i = 0; i < n; i++) {
    const b = base.texts[i];
    const c = cur.texts[i];
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
  imageRatios: { path: string; ratio: number }[];
}

export function pixelDiffs(result: PixelResult): Diff[] {
  const out: Diff[] = [];
  if (result.width !== result.curWidth || result.height !== result.curHeight) {
    out.push({
      kind: 'pixels',
      detail: `screenshot size ${result.width}x${result.height} -> ${result.curWidth}x${result.curHeight}`,
    });
  }
  if (result.textRegionRatio > TEXT_REGION_MAX_RATIO) {
    out.push({
      kind: 'pixels',
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
        (a.route === '*' || a.route === route) &&
        a.kinds.includes(d.kind) &&
        (!a.projects || a.projects.includes(project)) &&
        (!a.pathContains || (d.path ?? '').includes(a.pathContains)),
    );
    (hit ? ok : bad).push(d);
  }
  return { approved: ok, unapproved: bad };
}

function fmt(b: Box): string {
  return `${b.x},${b.y} ${b.w}x${b.h}`;
}
