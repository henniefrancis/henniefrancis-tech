import { describe, expect, it } from 'vitest';
import { countLabel, formatErrors, lintTree, schemaFor, validateTree } from '../src/validate.mjs';
import { validateMain } from '../src/validate-cli.mjs';
import { FIXTURE_ROOT, fixtureTree, rules } from './helpers.mjs';

const has = (tree, expected) => expect(rules(validateTree(tree))).toContain(expected);

describe('schemaFor', () => {
  it('maps content paths to schemas and rejects everything else', () => {
    expect(schemaFor('site.yaml')).toBe('site');
    expect(schemaFor('pages/home.yaml')).toBe('page-home');
    expect(schemaFor('pages/unknown.yaml')).toBeUndefined();
    expect(schemaFor('certifications/items/a-b.yaml')).toBe('cert-item');
    expect(schemaFor('certifications/details/mcts/ABCDEFGH-1.yaml')).toBe('cert-detail');
    expect(schemaFor('speaking/events/a/2024-cl.yaml')).toBe('event');
    expect(schemaFor('speaking/galleries/a/2024.yaml')).toBe('gallery');
    expect(schemaFor('speaking/events/A/2024.yaml')).toBeUndefined();
  });
});

describe('validateTree on the fixture tree', () => {
  it('has no errors and only the expected warning', () => {
    const tree = fixtureTree();
    expect(validateTree(tree)).toEqual([]);
    expect(rules(lintTree(tree))).toEqual(['speaking/events/conf-one/2025-lounge.yaml /links/0/gallery gallery-link-without-gallery']);
  });
});

describe('structure and schema errors', () => {
  it('passes tree load errors through and reports missing and unexpected files', () => {
    const tree = fixtureTree();
    tree.errors = [{ file: 'x.yaml', pointer: '', rule: 'yaml-bad' }];
    delete tree.files['pages/blog.yaml'];
    tree.files['pages/extra.yaml'] = {};
    has(tree, 'x.yaml  yaml-bad');
    has(tree, 'pages/blog.yaml  missing-file');
    has(tree, 'pages/extra.yaml  unexpected-file');
  });
  it('works without optional tree fields', () => {
    const tree = fixtureTree();
    delete tree.errors;
    delete tree.archive;
    expect(rules(validateTree(tree))).toEqual(['certifications/items/mongo-cert.yaml /evidence/0 evidence-missing']);
  });
  it('reports required, additional and unevaluated properties with the property in the pointer', () => {
    const tree = fixtureTree();
    delete tree.files['pages/home.yaml'].tiles;
    tree.files['pages/home.yaml'].surprise = 1;
    tree.files['site.yaml'].surprise = 1;
    delete tree.files['pages/blog.yaml'].heading;
    has(tree, 'pages/home.yaml /tiles required');
    has(tree, 'pages/home.yaml /surprise unevaluatedProperties');
    has(tree, 'site.yaml /surprise additionalProperties');
    has(tree, 'pages/blog.yaml /heading required');
  });
  it('rejects tag-like text, control characters, bidi overrides and long text', () => {
    const tree = fixtureTree();
    tree.files['pages/blog.yaml'].intro = 'a <b>bold</b>';
    tree.files['pages/cv.yaml'].heading = 'tab\there';
    tree.files['pages/projects.yaml'].heading = 'rtl ‮ text';
    tree.files['pages/portfolio.yaml'].heading = 'x'.repeat(201);
    has(tree, 'pages/blog.yaml /intro not');
    has(tree, 'pages/cv.yaml /heading not');
    has(tree, 'pages/projects.yaml /heading not');
    has(tree, 'pages/portfolio.yaml /heading maxLength');
  });
  it('allows a plain less-than sign that is not a tag', () => {
    const tree = fixtureTree();
    tree.files['pages/blog.yaml'].intro = '3 < 4 and 5 <= 6';
    expect(validateTree(tree)).toEqual([]);
  });
  it('accepts https links only', () => {
    for (const bad of ['http://a.example.test/', 'javascript:alert(1)', 'https://User@a.example.test/', 'https://A.example.test/', '/relative', 'https://a.example.test/with space']) {
      const tree = fixtureTree();
      tree.files['pages/blog.yaml'].links[0].url = bad;
      has(tree, 'pages/blog.yaml /links/0/url pattern');
    }
    const tree = fixtureTree();
    tree.files['pages/blog.yaml'].links[0].url = 'https://www.a-b.example.test:8443/p?q=1#f';
    expect(validateTree(tree)).toEqual([]);
  });
  it('requires image paths below images/ with no traversal', () => {
    for (const bad of ['elsewhere/a.png', 'images/../a.png', 'images/./a.png', 'images/a b%.png']) {
      const tree = fixtureTree();
      tree.files['pages/biography.yaml'].portrait.src = bad;
      expect(rules(validateTree(tree)).some((r) => r.startsWith('pages/biography.yaml /portrait/src'))).toBe(true);
    }
  });
  it('requires alt text on images and a name and alt text on every certification', () => {
    const tree = fixtureTree();
    tree.files['pages/biography.yaml'].portrait.alt = '';
    tree.files['certifications/items/aws-cert-a.yaml'].name = '';
    tree.files['certifications/items/aws-cert-a.yaml'].image.alt = '';
    has(tree, 'pages/biography.yaml /portrait/alt minLength');
    has(tree, 'certifications/items/aws-cert-a.yaml /name minLength');
    has(tree, 'certifications/items/aws-cert-a.yaml /image/alt minLength');
  });
  it('types the contact and referee fields', () => {
    const setters = [
      ['pages/cv.yaml', (t, x) => (t.files['pages/cv.yaml'].contact.email = x)],
      ['pages/cv.yaml', (t, x) => (t.files['pages/cv.yaml'].contact.phone.e164 = x)],
      ['pages/career-history.yaml', (t, x) => (t.files['pages/career-history.yaml'].employers[0].positions[0].referee.email = x)],
    ];
    for (const [path, set] of setters) {
      const tree = fixtureTree();
      set(tree, 'not valid');
      expect(rules(validateTree(tree)).some((r) => r.startsWith(path) && r.endsWith('pattern'))).toBe(true);
    }
  });
  it('allows a certification without a link and refuses one with both a url and a detail', () => {
    const tree = fixtureTree();
    delete tree.files['certifications/items/aws-cert-a.yaml'].url;
    expect(rules(validateTree(tree)).filter((r) => r.includes('aws-cert-a'))).toEqual([]);
    tree.files['certifications/items/aws-cert-a.yaml'].url = 'https://x.example.test/a';
    tree.files['certifications/items/aws-cert-a.yaml'].detail = { type: 'mcts', id: 'AAAAAAAA-0000-0000-0000-000000000001' };
    has(tree, 'certifications/items/aws-cert-a.yaml  not');
  });
});

describe('cross-file checks', () => {
  it('checks categories against item files', () => {
    const tree = fixtureTree();
    tree.files['certifications/categories.yaml'].categories[0].items.push('ghost', 'aws-cert-a');
    delete tree.files['certifications/items/aws-extra.yaml'];
    tree.files['certifications/items/orphan.yaml'] = structuredClone(tree.files['certifications/items/aws-cert-a.yaml']);
    has(tree, 'certifications/categories.yaml /categories/0/items/3 unknown-item');
    has(tree, 'certifications/categories.yaml /categories/0/items/4 item-listed-twice');
    has(tree, 'certifications/categories.yaml /categories/0/items/2 unknown-item');
    has(tree, 'certifications/items/orphan.yaml  item-not-listed');
  });
  it('limits countAs to certifications and expired labels to the feature flag', () => {
    const tree = fixtureTree();
    tree.files['certifications/items/aws-extra.yaml'].countAs = 'x';
    has(tree, 'certifications/items/aws-extra.yaml /countAs count-as-needs-certification');
    delete tree.files['site.yaml'].features;
    has(tree, 'certifications/items/aws-cert-b.yaml /status expired-labels-disabled');
    has(tree, 'certifications/items/ms-trainer-2022.yaml /status expired-labels-disabled');
  });
  it('checks detail references and evidence files', () => {
    const tree = fixtureTree();
    tree.files['certifications/items/ms-cert-1.yaml'].detail = { type: 'nope', id: 'ZZZZZZZZ-1' };
    tree.archive = [];
    has(tree, 'certifications/items/ms-cert-1.yaml /detail/type unknown-detail-type');
    has(tree, 'certifications/items/ms-cert-1.yaml /detail unknown-detail');
    has(tree, 'certifications/items/mongo-cert.yaml /evidence/0 evidence-missing');
  });
  it('checks speaking events, galleries and the listing', () => {
    const tree = fixtureTree();
    tree.files['speaking/galleries/ghost/2024.yaml'] = structuredClone(tree.files['speaking/galleries/conf-one/2025.yaml']);
    tree.files['pages/public-speaking.yaml'].years[0].events.push('conf-two/2024', 'ghost/2023');
    delete tree.files['speaking/events/conf-two/2024.yaml'];
    tree.files['speaking/events/conf-three/2024.yaml'] = structuredClone(tree.files['speaking/events/conf-one/2025.yaml']);
    has(tree, 'speaking/galleries/ghost/2024.yaml  gallery-without-event');
    has(tree, 'pages/public-speaking.yaml /years/0/events/3 unknown-event');
    has(tree, 'pages/public-speaking.yaml /years/0/events/2 unknown-event');
    has(tree, 'speaking/events/conf-three/2024.yaml  event-not-listed');
    const dup = fixtureTree();
    dup.files['pages/public-speaking.yaml'].years[1].events.push('conf-one/2025');
    has(dup, 'pages/public-speaking.yaml /years/1/events/1 event-listed-twice');
  });
  it('checks internal routes on home and portfolio tiles', () => {
    const tree = fixtureTree();
    tree.files['pages/home.yaml'].tiles[0].route = '/nowhere';
    tree.files['pages/portfolio.yaml'].tiles[0].route = '/portfolio/ghost';
    has(tree, 'pages/home.yaml /tiles/0/route unknown-route');
    has(tree, 'pages/portfolio.yaml /tiles/0/route unknown-route');
  });
  it('allows only the two count tokens', () => {
    const tree = fixtureTree();
    tree.files['pages/blog.yaml'].intro = 'bad ${other} token';
    has(tree, 'pages/blog.yaml /intro bad-token');
  });
  it('survives malformed files without throwing and still reports the rest', () => {
    const tree = fixtureTree();
    tree.files['pages/home.yaml'] = null;
    tree.files['pages/portfolio.yaml'] = 'text';
    tree.files['certifications/categories.yaml'] = { categories: 'x' };
    tree.files['certifications/detail-types.yaml'] = { types: [1] };
    tree.files['certifications/items/aws-cert-a.yaml'].detail = 'x';
    tree.files['certifications/items/aws-cert-a.yaml'].evidence = 'x';
    tree.files['certifications/items/aws-cert-b.yaml'].evidence = ['archive/x'];
    tree.files['pages/public-speaking.yaml'] = { years: [null, { events: 'x' }] };
    tree.files['speaking/events/conf-one/2025.yaml'].links = 'x';
    tree.files['pages/blog.yaml'] = { tiles: [null] };
    const errors = rules(validateTree(tree));
    expect(errors).toContain('pages/home.yaml  type');
    expect(errors).toContain('pages/portfolio.yaml  type');
    expect(errors.some((e) => e.includes('item-not-listed'))).toBe(true);
    expect(rules(lintTree(tree)).length).toBeGreaterThanOrEqual(0);
  });
  it('lints tolerate malformed files', () => {
    const tree = fixtureTree();
    tree.files['speaking/events/conf-one/2025.yaml'] = { year: 5, links: [null] };
    tree.files['speaking/galleries/conf-one/2025.yaml'] = { year: '1999' };
    tree.files['pages/blog.yaml'] = 'text';
    expect(rules(lintTree(tree))).toEqual([
      'speaking/events/conf-one/2025-lounge.yaml /links/0/gallery gallery-link-without-gallery',
      'speaking/galleries/conf-one/2025.yaml /year edition-year-mismatch',
    ]);
  });
  it('warns when a gallery link has no gallery, and when the edition does not match the year', () => {
    const tree = fixtureTree();
    tree.files['speaking/events/conf-one/2025-lounge.yaml'].year = '1999';
    const warnings = rules(lintTree(tree));
    expect(warnings).toContain('speaking/events/conf-one/2025-lounge.yaml /year edition-year-mismatch');
  });
});

describe('formatErrors and validateMain', () => {
  it('countLabel pluralises', () => {
    expect(countLabel(1, 'error')).toBe('1 error');
    expect(countLabel(2, 'error')).toBe('2 errors');
  });
  it('prints file, pointer and rule only', () => {
    expect(formatErrors([{ file: 'a.yaml', pointer: '', rule: 'r' }, { file: 'b.yaml', pointer: '/x', rule: 's' }])).toBe('a.yaml / r\nb.yaml /x s');
  });
  it('returns 0 for a valid tree and prints the warning count', () => {
    const out = [];
    const err = [];
    const code = validateMain({ root: '/unused', env: {}, argv: [FIXTURE_ROOT], out: (m) => out.push(m), err: (m) => err.push(m) });
    expect(code).toBe(0);
    expect(out).toEqual(['content: valid']);
    expect(err[0]).toContain('1 warning');
  });
  it('returns 1 and reports errors, using CONTENT_SRC and the default folder', () => {
    const err = [];
    const bad = { files: {}, errors: [], archive: [] };
    expect(validateMain({ root: '/r', env: { CONTENT_SRC: '/x' }, argv: [], out() {}, err: (m) => err.push(m), load: (p) => ((err.push(p), bad)) })).toBe(1);
    expect(err[0]).toBe('/x');
    expect(err[1]).toContain('errors');
    const err2 = [];
    validateMain({ root: '/r', env: {}, argv: [], out() {}, err: (m) => err2.push(m), load: (p) => (err2.push(p.replaceAll('\\', '/')), { files: { 'site.yaml': 1 } }) });
    expect(err2[0]).toBe('/r/content-src');
  });
  it('uses the singular for one error', () => {
    const err = [];
    const tree = fixtureTree();
    delete tree.files['pages/blog.yaml'];
    validateMain({ root: '/r', env: {}, argv: ['/x'], out() {}, err: (m) => err.push(m), load: () => tree });
    expect(err.at(-1)).toMatch(/^content: 1 error\n/);
  });
});
