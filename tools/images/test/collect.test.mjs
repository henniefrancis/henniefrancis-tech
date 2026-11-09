import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  collectImages,
  findLocal,
  localCandidates,
  refsFromJson,
  refsFromText,
  stripJsonComments,
} from '../src/collect.mjs';

const BASE = 'https://cdn.example.test/p/';

describe('stripJsonComments', () => {
  it('removes line and block comments but not text inside strings', () => {
    const text = '{\n // gone\n "a": "http://x//y", /* gone */ "b": "q\\"//z" /* open';
    const cleaned = stripJsonComments(text);
    expect(cleaned).toContain('"http://x//y"');
    expect(cleaned).toContain('"q\\"//z"');
    expect(cleaned).not.toContain('gone');
  });

  it('handles an escape at the very end of a string and an unterminated block', () => {
    expect(stripJsonComments('"a\\')).toBe('"a\\');
    expect(stripJsonComments('1 /* never closed')).toBe('1 ');
  });
});

describe('refsFromJson', () => {
  it('resolves against imageBaseUrl and uses the JSON path as context', () => {
    const refs = refsFromJson({ imageBaseUrl: BASE + 'x/', items: [{ image: 'a/b.png' }, { image: '/c.png' }] });
    expect(refs).toEqual([
      { url: BASE + 'x/a/b.png', ctx: '.items.[]' },
      { url: BASE + 'x/c.png', ctx: '.items.[]' },
    ]);
  });

  it('adds photoBase only under photos, using assetBaseUrl', () => {
    const refs = refsFromJson({
      assetBaseUrl: BASE,
      photoBase: 'ev/2024/',
      header: { image: 'h.png' },
      photos: [{ image: 'p1.jpg' }],
    });
    expect(refs.map((r) => r.url)).toEqual([BASE + 'h.png', BASE + 'ev/2024/p1.jpg']);
  });

  it('ignores a non-string photoBase', () => {
    const refs = refsFromJson({ assetBaseUrl: BASE, photoBase: 3, photos: [{ image: 'p.jpg' }] });
    expect(refs[0].url).toBe(BASE + 'p.jpg');
  });

  it('keeps absolute https URLs and reports relative ones with no base', () => {
    const refs = refsFromJson({ list: [{ image: 'https://other.example.test/z.png' }, { image: 'rel.png' }], image: { nested: 1 } });
    expect(refs).toEqual([
      { url: 'https://other.example.test/z.png', ctx: '.list.[]' },
      { unresolved: 'rel.png', ctx: '.list.[]' },
    ]);
  });

  it('skips scalars', () => {
    expect(refsFromJson({ n: 1, s: 'text', z: null })).toEqual([]);
  });
});

describe('refsFromText', () => {
  it('finds full URLs, base + literal, and bare image keys against a single base', () => {
    const text = `
      const A =
        '${BASE}index/';
      const x = { image: 'tile.png' };
      const y = this.A + 'profile.png';
      const z = A + 'other.jpg';
      const full = "${BASE}certs/c.png";
      const alsoFull = { image: "${BASE}certs/c.png" };
    `;
    const urls = refsFromText(text).map((r) => r.url);
    expect(urls).toEqual(expect.arrayContaining([
      BASE + 'certs/c.png',
      BASE + 'index/profile.png',
      BASE + 'index/other.jpg',
      BASE + 'index/tile.png',
    ]));
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('does not take an earlier property name as the base identifier', () => {
    const text = `@Component({ selector: 'a-b', imports: [X] })
class C {
  protected readonly imageBase =
    '${BASE}i/';
  p = this.imageBase + 'profile.png';
}`;
    expect(refsFromText(text).map((r) => r.url)).toEqual([BASE + 'i/profile.png']);
  });

  it('skips concatenation with an unknown identifier', () => {
    expect(refsFromText("const s = unknown + 'a.png';")).toEqual([]);
  });

  it('reports bare names it cannot place when there is not exactly one base', () => {
    expect(refsFromText("const t = { image: 'a.png' };")).toEqual([{ unresolved: 'a.png', ctx: '' }]);
    const two = `const A = '${BASE}a/'; const B = '${BASE}b/'; const t = { image: 'a.png' };`;
    expect(refsFromText(two)).toEqual([{ unresolved: 'a.png', ctx: '' }]);
  });
});

describe('collectImages', () => {
  it('walks the app folder, merges sources and ignores specs', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'img-collect-'));
    const app = path.join(root, 'src', 'app');
    await mkdir(path.join(app, 'sub'), { recursive: true });
    await writeFile(path.join(app, 'a.json'), `{ // note\n "imageBaseUrl": "${BASE}index/", "items": [{ "image": "same.png" }] }`);
    await writeFile(path.join(app, 'sub', 'b.ts'), `const A = '${BASE}index/'; const s = A + 'same.png'; const t = { image: 'rel.png' };`);
    await writeFile(path.join(app, 'sub', 'c.html'), `<img src="${BASE}index/other.svg">`);
    await writeFile(path.join(app, 'sub', 'd.spec.ts'), `const s = '${BASE}ignored.png';`);
    await writeFile(path.join(app, 'sub', 'notes.txt'), `${BASE}ignored2.png`);
    await writeFile(path.join(app, 'nobase.json'), '{ "items": [{ "image": "lost.png" }] }');

    const { images, unresolved } = await collectImages(app, root);
    const same = images.get(BASE + 'index/same.png');
    expect(same.sources).toEqual(['src/app/a.json', 'src/app/sub/b.ts']);
    expect(same.profile).toBe('tile');
    expect(images.has(BASE + 'index/rel.png')).toBe(true);
    expect(images.has(BASE + 'index/other.svg')).toBe(true);
    expect(images.has(BASE + 'ignored.png')).toBe(false);
    expect(images.size).toBe(3);
    expect(unresolved).toEqual([{ file: 'src/app/nobase.json', value: 'lost.png' }]);
  });

  it('lists a source once when it repeats a URL', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'img-collect-'));
    await writeFile(path.join(root, 'x.json'), `{ "imageBaseUrl": "${BASE}", "a": {"image":"i.png"}, "b": {"image":"i.png"} }`);
    const { images } = await collectImages(root, root);
    expect(images.get(BASE + 'i.png').sources).toEqual(['x.json']);
  });
});

describe('localCandidates and findLocal', () => {
  it('lists path suffixes, longest first', () => {
    expect(localCandidates(`${BASE}aws/certified/a%20b.png`)).toEqual(['p/aws/certified/a b.png', 'aws/certified/a b.png', 'certified/a b.png', 'a b.png']);
  });

  it('refuses suspicious segments', () => {
    expect(localCandidates('https://h.test/a/%5Cb.png')).toEqual([]);
    expect(localCandidates('https://h.test/a/C%3Ab.png')).toEqual([]);
    expect(localCandidates('https://h.test/a/b%00.png')).toEqual([]);
    expect(localCandidates('https://h.test/a/%2e%2e/b.png')).toEqual(['b.png']);
  });

  it('finds the longest match under the local folder, or null', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'img-local-'));
    await mkdir(path.join(dir, 'aws', 'certified'), { recursive: true });
    await writeFile(path.join(dir, 'aws', 'certified', 'a.png'), 'LOCAL');
    const found = await findLocal(dir, `${BASE}certifications/aws/certified/a.png`);
    expect(found.toString()).toBe('LOCAL');
    expect(await findLocal(dir, `${BASE}certifications/aws/certified/missing.png`)).toBeNull();
    expect(await findLocal(dir, 'https://h.test/%2e%2e/a.png')).toBeNull();
  });
});
