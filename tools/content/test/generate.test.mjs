import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ContentError, buildModules, main, resolveStaticImages, stableStringify, writeModules } from '../src/generate.mjs';
import { FIXTURE_ROOT, fixtureTree } from './helpers.mjs';

const CONTENT_DIR = join(import.meta.dirname, '..', '..', '..', 'src', 'app', 'content');
// The image reference fields are declared in image.ts, which content.types.ts extends.
const TYPES = ['content.types.ts', 'image.ts'].map((f) => readFileSync(join(CONTENT_DIR, f), 'utf8')).join(' ');

describe('stableStringify and resolveStaticImages', () => {
  it('sorts object keys and keeps array order', () => {
    expect(stableStringify({ b: [2, 1], a: { d: 1, c: null } }, 0)).toBe('{"a":{"c":null,"d":1},"b":[2,1]}');
  });
  it('keeps the image reference keys first, in a fixed order, then the other keys sorted', () => {
    const ref = { widths: [1, 2], alt: 'A', h: 3, w: 2, id: '0123456789abcdef', extra: true };
    expect(stableStringify({ ref }, 0)).toBe('{"ref":{"id":"0123456789abcdef","w":2,"h":3,"widths":[1,2],"alt":"A","extra":true}}');
  });
  it('gives a static image its site path and leaves other values alone', () => {
    const out = resolveStaticImages({ a: [{ src: 'images/x/y.svg', alt: 'A', extra: 1 }], n: 3, src: 'images/not-an-image', z: null });
    expect(out).toEqual({ a: [{ src: '/images/x/y.svg', alt: 'A', extra: 1 }], n: 3, src: 'images/not-an-image', z: null });
  });
});

describe('buildModules', () => {
  const result = buildModules(fixtureTree());
  const moduleValue = (name, exportName) => {
    const source = result.modules[name];
    const body = source.slice(source.indexOf(`export const ${exportName}`));
    const json = body.slice(body.indexOf('= ') + 2, body.indexOf(';\n'));
    return JSON.parse(json);
  };

  it('computes the counts and resolves tokens into plain integers', () => {
    expect(result.counts).toEqual({ aws: 2, microsoft: 2 });
    expect(moduleValue('home.ts', 'HOME').tagline).toEqual(['Builder', '2x AWS Certified', '2x Microsoft Certified', 'Pilot']);
    expect(moduleValue('biography.ts', 'BIOGRAPHY').paragraphs[0]).toBe('Paragraph one with 2 AWS Certifications.');
  });
  it('emits every module with the generated header and the content hash', () => {
    expect(Object.keys(result.modules).sort()).toEqual(
      ['biography.ts', 'blog.ts', 'career-history.ts', 'certifications.ts', 'current-role.ts', 'cv.ts', 'home.ts', 'meta.ts', 'not-found.ts', 'pages.ts', 'portfolio.ts', 'prerender.ts', 'projects.ts', 'records.ts', 'site.ts', 'social.ts', 'special-awards.ts', 'speaking.ts', 'tech-stack.ts'].sort(),
    );
    for (const source of Object.values(result.modules)) expect(source).toContain('GENERATED');
    expect(result.modules['meta.ts']).toContain(result.hash);
  });
  it('passes image references through, gives static images a site path and links an href or route', () => {
    expect(moduleValue('home.ts', 'HOME').profile).toEqual({ alt: 'Fixture profile', id: 'e5393622926c6c39', w: 200, h: 100, widths: [100, 200] });
    expect(moduleValue('current-role.ts', 'CURRENT_ROLE').logo.image).toEqual({ alt: 'Employer', src: '/images/fixture/employer.svg' });
    const cats = moduleValue('certifications.ts', 'CERT_CATEGORIES');
    expect(cats[0].badges[0].href).toBe('https://credly.example.test/a');
    expect(cats[3].badges[0].route).toBe('/certifications/microsoft/mcts/AAAAAAAA-0000-0000-0000-000000000001');
  });
  it('builds events with resolved links, listings, galleries, params and record summaries', () => {
    const events = moduleValue('speaking.ts', 'EVENTS');
    const one = events['conf-one/2025'];
    expect(one.links[0].href).toBe('https://sessions.example.test/talk');
    expect(one.links[1].route).toBe('/public-speaking/conf-one/photos/2025');
    expect(one.links[2]).toEqual({ image: expect.any(Object), label: 'Watch', title: 'Full Video' });
    expect(events['conf-two/2024'].body).toEqual([]);
    const index = moduleValue('speaking.ts', 'SPEAKING_INDEX');
    expect(index[0].talks[0]).toMatchObject({ name: 'Conference One 2025', route: '/public-speaking/conf-one/2025' });
    const params = moduleValue('prerender.ts', 'PRERENDER_PARAMS');
    expect(params.events).toContainEqual({ event: 'conf-one', year: '2025-lounge' });
    expect(params.galleries).toEqual([{ event: 'conf-one', year: '2025' }]);
    expect(params.certDetails).toEqual([{ id: 'AAAAAAAA-0000-0000-0000-000000000001', type: 'mcts' }]);
    const records = moduleValue('records.ts', 'RECORDS');
    expect(records['/public-speaking/conf-one/2025']).toEqual({ heading: 'A talk title', kind: 'event', title: 'Conference One', year: '2025' });
    expect(records['/public-speaking/conf-two/2024']).toEqual({ kind: 'event', title: 'Conference Two', year: '2024' });
    expect(records['/public-speaking/conf-one/photos/2025'].kind).toBe('gallery');
    expect(records['/certifications/microsoft/mcts/AAAAAAAA-0000-0000-0000-000000000001'].kind).toBe('certificate');
    expect(moduleValue('prerender.ts', 'ROUTE_LIST')).toEqual(result.routes);
  });
  it('builds pages with optional fields only when present', () => {
    const pages = moduleValue('pages.ts', 'PAGES');
    expect(pages.home).toMatchObject({ route: '/', title: 'Fixture Person' });
    expect(pages['not-found'].route).toBe('/404');
    const tree = fixtureTree();
    delete tree.files['pages/cv.yaml'].description;
    delete tree.files['pages/home.yaml'].description;
    delete tree.files['pages/home.yaml'].heading;
    delete tree.files['pages/home.yaml'].name;
    // home without heading is invalid: build fails closed instead
    expect(() => buildModules(tree)).toThrow(ContentError);
  });
  it('omits the description of a page that has none', () => {
    const tree = fixtureTree();
    delete tree.files['pages/cv.yaml'].description;
    const built = buildModules(tree);
    expect(built.modules['pages.ts']).not.toContain('Fixture cv description');
  });
  it('is deterministic: the same input gives the same bytes', () => {
    expect(buildModules(fixtureTree()).modules).toEqual(result.modules);
  });
  it('fails closed on invalid content with file, pointer and rule only', () => {
    const tree = fixtureTree();
    tree.files['pages/blog.yaml'].intro = '<script>alert(1)</script>';
    try {
      buildModules(tree);
      throw new Error('should not build');
    } catch (error) {
      expect(error).toBeInstanceOf(ContentError);
      expect(error.message).toContain('pages/blog.yaml /intro not');
      expect(error.message).not.toContain('alert');
      expect(error.message).toContain('1 error)');
    }
  });
  it('uses the plural for several errors', () => {
    const tree = fixtureTree();
    delete tree.files['pages/blog.yaml'];
    delete tree.files['pages/cv.yaml'];
    expect(() => buildModules(tree)).toThrow(/2 errors/);
  });
});

describe('types stay in step with the generated shapes', () => {
  it('declares every generated property name in content.types.ts', () => {
    const { modules } = buildModules(fixtureTree());
    const names = new Set();
    const collect = (value) => {
      if (Array.isArray(value)) value.forEach(collect);
      else if (value && typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) {
          if (/^[a-z][A-Za-z]*$/.test(k)) names.add(k);
          collect(v);
        }
      }
    };
    for (const [name, source] of Object.entries(modules)) {
      if (name === 'meta.ts') continue;
      for (const block of source.split('export const ').slice(1)) {
        const json = block.slice(block.indexOf('= ') + 2, block.indexOf(';\n'));
        const parsed = JSON.parse(json);
        // Record maps keyed by route or "type/id" have free-form keys; check their values only.
        if (['EVENTS', 'GALLERIES', 'CERT_DETAILS', 'CERT_DETAIL_TYPES', 'RECORDS', 'PAGES'].some((n) => block.startsWith(n))) Object.values(parsed).forEach(collect);
        else collect(parsed);
      }
    }
    const missing = [...names].filter((n) => !new RegExp(`\\b${n}\\??:`).test(TYPES));
    expect(missing).toEqual([]);
  });
});

describe('writeModules and main', () => {
  const dirs = [];
  afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));
  const temp = () => {
    const dir = mkdtempSync(join(tmpdir(), 'hft-gen-'));
    dirs.push(dir);
    return dir;
  };

  it('writes the modules and the hash file and removes stale generated files', () => {
    const dir = temp();
    const out = join(dir, 'generated');
    mkdirSync(out);
    writeFileSync(join(out, 'stale.ts'), 'old');
    const result = buildModules(fixtureTree());
    writeModules(out, result);
    const files = readdirSync(out);
    expect(files).not.toContain('stale.ts');
    expect(files).toContain('content-hash.txt');
    expect(readFileSync(join(out, 'content-hash.txt'), 'utf8').trim()).toBe(result.hash);
    writeModules(out, result);
    expect(readdirSync(out).length).toBe(files.length);
  });

  it('main writes into src/app/content/generated and reports counts and the hash, never content', () => {
    const root = temp();
    const out = [];
    const err = [];
    const code = main({ root, env: {}, argv: ['--src', FIXTURE_ROOT, '--expect-counts', 'aws=2,microsoft=2'], out: (m) => out.push(m), err: (m) => err.push(m) });
    expect(code).toBe(0);
    expect(out[0]).toMatch(/^content: 18 routes, aws=2,microsoft=2, hash=[0-9a-f]{64}$/);
    expect(err[0]).toContain('1 warning');
    expect(readdirSync(join(root, 'src', 'app', 'content', 'generated'))).toContain('home.ts');
  });

  it('main fails when the expected counts differ, and writes nothing', () => {
    const root = temp();
    const err = [];
    const code = main({ root, env: {}, argv: ['--src', FIXTURE_ROOT, '--expect-counts', 'aws=4,microsoft=19'], out() {}, err: (m) => err.push(m) });
    expect(code).toBe(1);
    expect(err.at(-1)).toBe('content: certification counts are aws=2,microsoft=2, expected aws=4,microsoft=19');
    expect(() => readdirSync(join(root, 'src'))).toThrow();
  });

  it('main reads CONTENT_SRC, then the default folder, and fails closed on errors', () => {
    const seen = [];
    const err = [];
    const bad = { files: {}, errors: [], archive: [], hash: '' };
    const load = (p) => (seen.push(p.replaceAll('\\', '/')), bad);
    expect(main({ root: '/r', env: { CONTENT_SRC: '/from-env' }, load, out() {}, err: (m) => err.push(m), write() {} })).toBe(1);
    expect(main({ root: '/r', env: {}, load, out() {}, err: (m) => err.push(m), write() {} })).toBe(1);
    expect(seen).toEqual(['/from-env', '/r/content-src']);
    expect(err[0]).toContain('Content validation failed');
  });

  it('main reports an unexpected failure by name only', () => {
    const err = [];
    const code = main({ root: '/r', env: {}, load: () => { throw new TypeError('secret detail'); }, out() {}, err: (m) => err.push(m) });
    expect(code).toBe(1);
    expect(err).toEqual(['content: generation failed (TypeError)']);
  });

  it('main without warnings stays quiet on stderr', () => {
    const err = [];
    const tree = fixtureTree();
    delete tree.files['speaking/events/conf-one/2025-lounge.yaml'].links[0].gallery;
    tree.files['speaking/events/conf-one/2025-lounge.yaml'].links[0].url = 'https://x.example.test/';
    const code = main({ root: '/r', env: {}, argv: ['--src', '/x'], load: () => tree, out() {}, err: (m) => err.push(m), write() {} });
    expect(code).toBe(0);
    expect(err).toEqual([]);
  });
});
