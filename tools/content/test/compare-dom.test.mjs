import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { compareDirs, compareMain, diffTrees, htmlFiles, isKnown, normaliseHtml } from '../src/compare-dom.mjs';

const page = (body, head = '') => `<!doctype html><html><head>${head}</head><body>${body}</body></html>`;
const same = (a, b) => diffTrees(normaliseHtml(a), normaliseHtml(b));

describe('normaliseHtml', () => {
  it('ignores comments, whitespace layout, generated attributes, hashes and preload hints', () => {
    const a = page('<app-root _nghost-ng-c1="" ng-version="22.0.0" ngh="0"><!-- x --><p _ngcontent-ng-c1="" class=" a   b ">Hello   world</p></app-root><script src="main-ABCD1234.js"></script>', '<link rel="modulepreload" href="chunk-1.js"><style>p[_ngcontent-ng-c123]{}</style>');
    const b = page('<app-root _nghost-ng-c9="" ng-version="23.0.0"><p _ngcontent-ng-c9="" class="a b">Hello world</p></app-root><script src="main-WXYZ9876.js"></script>', '<style>p[_ngcontent-ng-c456]{}</style>');
    expect(same(a, b)).toEqual([]);
  });
  it('ignores the Angular transfer state content', () => {
    expect(same(page('<script id="ng-state" type="application/json">{"a":1}</script>'), page('<script id="ng-state" type="application/json">{"a":2}</script>'))).toEqual([]);
  });
  it('keeps the space next to inline elements but not at element edges', () => {
    expect(same(page('<p>a <b>x</b> c</p>'), page('<p> a <b>x</b> c </p>'))).toEqual([]);
    expect(same(page('<p>a <b>x</b> c</p>'), page('<p>a<b>x</b>c</p>')).length).toBeGreaterThan(0);
    expect(same(page('<p>a <i></i> <b>x</b></p>'), page('<p>a <i></i><b>x</b></p>')).length).toBeGreaterThan(0);
  });
  it('treats a space at the edge of an inline element as the same as a space just outside it', () => {
    expect(same(page('<h5>Engineer<sub>  Nov</sub></h5>'), page('<h5>Engineer <sub>Nov</sub></h5>'))).toEqual([]);
    expect(same(page('<p>a <sub>x</sub> b</p>'), page('<p>a<sub> x </sub>b</p>'))).toEqual([]);
    expect(same(page('<p><sub> x</sub></p>'), page('<p><sub>x</sub></p>'))).toEqual([]);
    expect(same(page('<h5>Engineer<sub>Nov</sub></h5>'), page('<h5>Engineer <sub>Nov</sub></h5>')).length).toBeGreaterThan(0);
  });
  it('ignores spaces next to a line break', () => {
    expect(same(page('<p>a <br /> b<br /> c</p>'), page('<p>a<br />b <br />c</p>'))).toEqual([]);
    expect(same(page('<p>a<br>b</p>'), page('<p>ab</p>')).length).toBeGreaterThan(0);
    expect(same(page('<p><b>x</b><br><i>y</i></p>'), page('<p><b>x</b><br><i>y</i></p>'))).toEqual([]);
  });
  it('includes template content', () => {
    expect(same(page('<template><p>x</p></template>'), page('<template><p>y</p></template>')).length).toBeGreaterThan(0);
  });
  it('joins text split by a removed comment', () => {
    expect(same(page('<p>a<!-- x -->b</p>'), page('<p>ab</p>'))).toEqual([]);
  });
  it('drops text that is only whitespace', () => {
    expect(same(page('<div> </div>'), page('<div></div>'))).toEqual([]);
  });
});

describe('diffTrees', () => {
  it('reports text, tag, attribute and child count differences with a path', () => {
    const diffs = same(page('<p a="1">x</p><div></div><section></section>'), page('<p a="2">y</p><span></span>'));
    const kinds = diffs.map((d) => d.what);
    expect(kinds).toContain('attribute a');
    expect(kinds).toContain('node');
    expect(kinds).toContain('tag');
    expect(kinds).toContain('child-count');
    expect(diffs[0].path).toContain('/html[');
  });
  it('compares text against an element', () => {
    expect(same(page('<p>x</p>'), page('<p><b>x</b></p>'))[0].what).toBe('node');
  });
  it('caps the number of differences', () => {
    const many = Array.from({ length: 40 }, (_, i) => `<p>${i}</p>`).join('');
    const other = Array.from({ length: 40 }, (_, i) => `<p>x${i}</p>`).join('');
    expect(same(page(many), page(other)).length).toBe(25);
  });
  it('compares an attribute that exists on one side only', () => {
    expect(same(page('<p a="1"></p>'), page('<p></p>'))[0]).toMatchObject({ what: 'attribute a', after: 'undefined' });
  });
});

describe('compareDirs', () => {
  const dirs = [];
  afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));
  const build = (files) => {
    const dir = mkdtempSync(join(tmpdir(), 'hft-cmp-'));
    dirs.push(dir);
    for (const [path, html] of Object.entries(files)) {
      mkdirSync(join(dir, path, '..'), { recursive: true });
      writeFileSync(join(dir, path), html);
    }
    return dir;
  };

  it('lists html files recursively and sorted', () => {
    const dir = build({ 'b/index.html': '', 'a.html': '', 'a.txt': 'x' });
    expect(htmlFiles(dir)).toEqual(['a.html', 'b/index.html']);
  });
  it('finds differing, missing and added files', () => {
    const before = build({ 'index.html': page('<p>a</p>'), 'gone/index.html': page(''), 'same/index.html': page('<p>s</p>') });
    const after = build({ 'index.html': page('<p>b</p>'), 'new/index.html': page(''), 'same/index.html': page('<p>s</p>') });
    const result = compareDirs(before, after);
    expect(result.files).toBe(3);
    expect(result.differing.map((d) => d.file)).toEqual(['index.html']);
    expect(result.missing).toEqual(['gone/index.html']);
    expect(result.added).toEqual(['new/index.html']);
  });
  it('accepts an injected reader', () => {
    const before = build({ 'index.html': page('<p>a</p>') });
    expect(compareDirs(before, before, () => page('<p>z</p>')).differing).toEqual([]);
  });
});

describe('compareMain', () => {
  const diff = { path: '/p', what: 'attribute href', before: 'http://x', after: 'https://x' };
  const compare = (differing, missing = [], added = []) => () => ({ files: 3, differing, missing, added });
  const run = (argv, cmp, readJson) => {
    const out = [];
    const code = compareMain({ argv, out: (m) => out.push(m), compare: cmp, readJson });
    return { code, out };
  };

  it('prints usage when directories are missing', () => {
    expect(run([], compare([])).code).toBe(2);
    expect(run(['a'], compare([])).out[0]).toContain('usage');
  });
  it('returns 0 when nothing differs', () => {
    const { code, out } = run(['a', 'b'], compare([]));
    expect(code).toBe(0);
    expect(out.at(-1)).toBe('compared 3 files: 0 unexpected differences, 0 known (awaiting approval), 0 missing, 0 added');
  });
  it('fails on unexpected differences and missing files, and reports added files', () => {
    const { code, out } = run(['a', 'b'], compare([{ file: 'x.html', diffs: [diff] }], ['m.html'], ['n.html']));
    expect(code).toBe(1);
    expect(out).toContain('DIFF x.html');
    expect(out).toContain('MISSING m.html');
    expect(out).toContain('ADDED n.html');
  });
  it('lets known differences through but still lists them', () => {
    const known = [{ file: 'x.html', ...diff, reason: 'r' }];
    const { code, out } = run(['a', 'b', '--known', 'k.json'], compare([{ file: 'x.html', diffs: [diff] }]), () => known);
    expect(code).toBe(0);
    expect(out.some((l) => l.includes('KNOWN'))).toBe(true);
    expect(out.at(-1)).toContain('1 known');
  });
  it('isKnown needs file, what, before and after to match', () => {
    const known = [{ file: 'x.html', ...diff }];
    expect(isKnown('x.html', diff, known)).toBe(true);
    expect(isKnown('y.html', diff, known)).toBe(false);
    expect(isKnown('x.html', { ...diff, after: 'z' }, known)).toBe(false);
  });
  it('reads the known list from disk by default', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hft-known-'));
    try {
      const file = join(dir, 'k.json');
      writeFileSync(file, '[]');
      const out = [];
      expect(compareMain({ argv: ['a', 'b', '--known', file], out: (m) => out.push(m), compare: compare([]) })).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
