import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { IMAGE_EXTENSIONS, MAX_FILE_BYTES, MAX_TREE_BYTES, loadTree, normalise, parseYaml, toParagraphs } from '../src/load.mjs';
import { FIXTURE_ROOT } from './helpers.mjs';

describe('toParagraphs', () => {
  it('splits on blank lines and joins single line breaks with one space', () => {
    expect(toParagraphs('one\ntwo\n\n  \nthree\n\n\n')).toEqual(['one two', 'three']);
  });
  it('returns no paragraphs for empty text', () => {
    expect(toParagraphs('\n\n')).toEqual([]);
  });
});

describe('normalise', () => {
  it('NFC-normalises strings at every depth and leaves other values alone', () => {
    const decomposed = 'é';
    expect(normalise({ a: [decomposed, { b: decomposed }], n: 1, z: null })).toEqual({ a: ['é', { b: 'é' }], n: 1, z: null });
  });
});

describe('parseYaml', () => {
  it('parses YAML 1.2 core scalars (no becomes a string, not false)', () => {
    expect(parseYaml('answer: no\ncount: 3\n').data).toEqual({ answer: 'no', count: 3 });
  });
  it('turns block scalars into paragraph arrays, including CRLF input', () => {
    const { data } = parseYaml('text: |\r\n  first line\r\n  continues\r\n\r\n  second\r\nfolded: >\r\n  a\r\n  b\r\n');
    expect(data).toEqual({ text: ['first line continues', 'second'], folded: ['a b'] });
  });
  it('keeps token text as plain strings', () => {
    expect(parseYaml('t: ${aws-certifications}x AWS\n').data).toEqual({ t: '${aws-certifications}x AWS' });
  });
  it('reports only a rule code for syntax errors, duplicate keys and aliases', () => {
    const duplicate = parseYaml('a: 1\na: 2\n');
    expect(duplicate.errors).toEqual(['yaml-duplicate_key']);
    expect(parseYaml('a: &x 1\nb: *x\n').errors.length).toBeGreaterThan(0);
    expect(parseYaml('a: [1\n').errors.length).toBeGreaterThan(0);
  });
});

describe('loadTree', () => {
  const dirs = [];
  afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));
  const temp = () => {
    const dir = mkdtempSync(join(tmpdir(), 'hft-load-'));
    dirs.push(dir);
    return dir;
  };

  it('loads the fixture tree: files, archive listing and a stable hash', () => {
    const tree = loadTree(FIXTURE_ROOT);
    expect(tree.errors).toEqual([]);
    expect(Object.keys(tree.files)).toContain('pages/home.yaml');
    expect(tree.archive).toEqual(['archive/credly/mongo/20261107T101500Z/snapshot.json']);
    expect(tree.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(loadTree(FIXTURE_ROOT).hash).toBe(tree.hash);
  });

  it('reports a missing content folder', () => {
    const tree = loadTree(temp());
    expect(tree.errors).toEqual([{ file: 'content', pointer: '', rule: 'content-folder-missing' }]);
    expect(tree.hash).toBe('');
  });

  it('reports a content path that is not a folder', () => {
    const dir = temp();
    writeFileSync(join(dir, 'content'), 'x');
    expect(loadTree(dir).errors[0].rule).toBe('content-folder-missing');
  });

  it('reports yaml errors, unexpected file types and oversized files; collects images', () => {
    const dir = temp();
    mkdirSync(join(dir, 'content', 'images', 'a'), { recursive: true });
    writeFileSync(join(dir, 'content', 'bad.yaml'), 'a: [1\n');
    writeFileSync(join(dir, 'content', 'notes.txt'), 'x');
    writeFileSync(join(dir, 'content', 'noext'), 'x');
    writeFileSync(join(dir, 'content', 'big.yaml'), 'a: ' + 'x'.repeat(MAX_FILE_BYTES));
    writeFileSync(join(dir, 'content', 'images', 'a', 'p.PNG'), 'png');
    writeFileSync(join(dir, 'content', 'elsewhere.png'), 'png');
    const tree = loadTree(dir);
    const found = tree.errors.map((e) => `${e.file} ${e.rule}`);
    expect(found).toContain('notes.txt unexpected-file-type');
    expect(found).toContain('noext unexpected-file-type');
    expect(found).toContain('big.yaml file-too-large');
    expect(found).toContain('elsewhere.png unexpected-file-type');
    expect(found.some((f) => f.startsWith('bad.yaml yaml-'))).toBe(true);
    expect(tree.images).toEqual(['images/a/p.PNG']);
    expect(IMAGE_EXTENSIONS.has('.png')).toBe(true);
  });

  it('rejects symbolic links and an oversized tree (injected file system)', () => {
    const entries = { '/r/content': ['link', 'a.yaml'] };
    const key = (p) => p.replaceAll('\\', '/');
    const fs = {
      readdirSync: (p) => entries[key(p)] ?? [],
      lstatSync: (p) => {
        if (key(p) === '/r/content') return { isDirectory: () => true, isSymbolicLink: () => false, size: 0 };
        if (key(p) === '/r/content/link') return { isDirectory: () => false, isSymbolicLink: () => true, size: 0 };
        if (key(p).endsWith('/r/archive')) throw new Error('none');
        return { isDirectory: () => false, isSymbolicLink: () => false, size: MAX_TREE_BYTES + 1 };
      },
      readFileSync: () => Buffer.from('a: 1\n'),
    };
    const tree = loadTree('/r', fs);
    expect(tree.errors.map((e) => e.rule).sort()).toEqual(['file-too-large', 'symlink-not-allowed', 'tree-too-large']);
  });
});
