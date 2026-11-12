import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CSP_DIRECTIVES,
  CSP_FILE,
  HTML_CACHE,
  IMMUTABLE,
  cacheControlFor,
  cleanPath,
  mergeSlashes,
  mimeFor,
  redirectTarget,
} from '../src/rules.mjs';

describe('mimeFor', () => {
  it('maps known types and falls back', () => {
    expect(mimeFor('a.html')).toBe('text/html; charset=utf-8');
    expect(mimeFor('A.WOFF2')).toBe('font/woff2');
    expect(mimeFor('x.webp')).toBe('image/webp');
    expect(mimeFor('x.unknown')).toBe('application/octet-stream');
    expect(mimeFor('noext')).toBe('application/octet-stream');
  });
});

describe('cacheControlFor', () => {
  it('treats /img/ and hashed assets as immutable', () => {
    expect(cacheControlFor('/img/abc/480.webp', '/x/480.webp')).toBe(IMMUTABLE);
    expect(cacheControlFor('/main-ABCD1234.js', '/s/main-ABCD1234.js')).toBe(IMMUTABLE);
    expect(cacheControlFor('/media/font-Z6A7XZ4N.woff2', '/s/media/font-Z6A7XZ4N.woff2')).toBe(IMMUTABLE);
  });
  it('gives HTML no-cache with stale-if-error', () => {
    expect(cacheControlFor('/biography', '/s/biography.html')).toBe(HTML_CACHE);
    expect(HTML_CACHE).toContain('stale-if-error=86400');
  });
  it('gives everything else no-cache', () => {
    expect(cacheControlFor('/version.json', '/s/version.json')).toBe('no-cache');
    expect(cacheControlFor('/main.js', '/s/main.js')).toBe('no-cache');
  });
});

describe('redirectTarget', () => {
  it.each([
    ['/pages/biography.html', '/biography'],
    ['/pages/portfolio/cv.html', '/portfolio/cv'],
    ['/portfolio/', '/portfolio'],
    ['/a/b/c/', '/a/b/c'],
    ['/biography.html', '/biography'],
    ['/portfolio/cv.html', '/portfolio/cv'],
  ])('%s -> %s', (path, target) => {
    expect(redirectTarget(path)).toBe(target);
  });
  it.each(['/', '/biography', '/404.html', '/50x.html', '/main-ABCD1234.js', '/img/abc/480.webp'])(
    'leaves %s alone',
    (path) => {
      expect(redirectTarget(path)).toBeNull();
    },
  );
});

describe('path cleaning', () => {
  it('merges slashes', () => {
    expect(mergeSlashes('//a///b/')).toBe('/a/b/');
  });
  it('decodes and accepts normal paths', () => {
    expect(cleanPath('/a%20b//c')).toBe('/a b/c');
  });
  it.each(['/%zz', '/a%00b', '/a%5Cb', '/%2e%2e%2fetc', '/a%2f..%2fb', '/a%2f.%2fb'])('rejects %s', (p) => {
    expect(cleanPath(p)).toBeNull();
  });
});

describe('csp', () => {
  it('omits script-src and default-src (they come from Angular autoCsp)', () => {
    const joined = CSP_DIRECTIVES.join(';');
    expect(joined).not.toContain('script-src');
    expect(joined).not.toContain('default-src');
    expect(joined).toContain("object-src 'none'");
  });
});

describe('csp single source', () => {
  it('is read from the file Terraform uses, one directive per entry, with no empty entries', () => {
    const fromFile = readFileSync(CSP_FILE, 'utf8')
      .split(/\r?\n/)
      .filter((l) => l.trim() !== '');
    expect(CSP_DIRECTIVES).toEqual(fromFile);
    expect(CSP_DIRECTIVES).toContain('upgrade-insecure-requests');
    expect(CSP_DIRECTIVES.every((d) => d === d.trim() && !d.includes(';'))).toBe(true);
  });
});
