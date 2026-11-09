import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_SITE_URL,
  absoluteUrl,
  buildRobots,
  buildSitemap,
  escapeXml,
  findRoutes,
  main,
  parseSiteUrl,
  run,
} from '../src/seo.mjs';

let dist;
beforeEach(() => {
  dist = mkdtempSync(join(tmpdir(), 'hft-seo-'));
});
afterEach(() => rmSync(dist, { recursive: true, force: true }));

const put = (rel, content = '<html></html>') => {
  const file = join(dist, rel);
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, content);
};
const buildFixture = () => {
  put('index.html');
  put('index.csr.html');
  put('biography/index.html');
  put('current-role/index.html');
  put('public-speaking/index.html');
  put('public-speaking/aws-summit/2025/index.html');
  put('404/index.html', 'NOT FOUND PAGE');
  put('media/font.woff2', 'x');
};
const io = () => {
  const out = [];
  const err = [];
  return { io: { out: (s) => out.push(s), err: (s) => err.push(s) }, out, err };
};

describe('parseSiteUrl', () => {
  it('accepts an https origin', () => {
    expect(parseSiteUrl('https://henniefrancis.tech')).toBe('https://henniefrancis.tech');
    expect(parseSiteUrl('https://henniefrancis.tech/')).toBe('https://henniefrancis.tech');
  });
  it('rejects anything else', () => {
    expect(() => parseSiteUrl('not a url')).toThrow('not a valid URL');
    for (const bad of [
      'http://henniefrancis.tech',
      'https://henniefrancis.tech/path',
      'https://henniefrancis.tech/?a=1',
      'https://henniefrancis.tech/#x',
      'https://user@henniefrancis.tech',
    ]) {
      expect(() => parseSiteUrl(bad)).toThrow('https origin');
    }
  });
});

describe('xml and urls', () => {
  it('escapes xml special characters', () => {
    expect(escapeXml(`a&b<c>"d"'e'`)).toBe('a&amp;b&lt;c&gt;&quot;d&quot;&apos;e&apos;');
  });
  it('has no trailing slash except for home', () => {
    expect(absoluteUrl('https://x.test', '/')).toBe('https://x.test/');
    expect(absoluteUrl('https://x.test', '/blog')).toBe('https://x.test/blog');
  });
  it('builds a sorted sitemap without the excluded routes', () => {
    const xml = buildSitemap('https://x.test', ['/blog', '/', '/current-role', '/404', '/a&b']);
    expect(xml).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        '  <url><loc>https://x.test/</loc></url>',
        '  <url><loc>https://x.test/a&amp;b</loc></url>',
        '  <url><loc>https://x.test/blog</loc></url>',
        '</urlset>',
        '',
      ].join('\n'),
    );
  });
  it('builds robots.txt pointing at the sitemap', () => {
    expect(buildRobots('https://x.test')).toBe('User-agent: *\nAllow: /\n\nSitemap: https://x.test/sitemap.xml\n');
  });
});

describe('findRoutes', () => {
  it('lists every folder with an index.html, and the root', async () => {
    buildFixture();
    expect((await findRoutes(dist)).sort()).toEqual([
      '/',
      '/404',
      '/biography',
      '/current-role',
      '/public-speaking',
      '/public-speaking/aws-summit/2025',
    ]);
  });
});

describe('run', () => {
  it('moves the 404 page, removes its folder and writes robots.txt and sitemap.xml', async () => {
    buildFixture();
    const routes = await run(dist);
    expect(readFileSync(join(dist, '404.html'), 'utf8')).toBe('NOT FOUND PAGE');
    expect(existsSync(join(dist, '404'))).toBe(false);
    expect(routes).toEqual(['/', '/biography', '/public-speaking', '/public-speaking/aws-summit/2025']);
    const sitemap = readFileSync(join(dist, 'sitemap.xml'), 'utf8');
    expect(sitemap).toContain(`<loc>${DEFAULT_SITE_URL}/biography</loc>`);
    expect(sitemap).not.toContain('current-role');
    expect(sitemap).not.toContain('404');
    expect(readFileSync(join(dist, 'robots.txt'), 'utf8')).toContain(`Sitemap: ${DEFAULT_SITE_URL}/sitemap.xml`);
  });

  it('uses the given site url', async () => {
    buildFixture();
    await run(dist, 'https://staging.example.test');
    expect(readFileSync(join(dist, 'sitemap.xml'), 'utf8')).toContain('https://staging.example.test/biography');
  });

  it('fails clearly when the prerendered 404 page is missing, writing nothing', async () => {
    put('index.html');
    await expect(run(dist)).rejects.toThrow('404/index.html');
    expect(existsSync(join(dist, 'sitemap.xml'))).toBe(false);
  });

  it('fails on a bad site url before touching the output', async () => {
    buildFixture();
    await expect(run(dist, 'http://insecure.test')).rejects.toThrow('https origin');
    expect(existsSync(join(dist, '404', 'index.html'))).toBe(true);
  });
});

describe('main', () => {
  it('prints usage without exactly one argument', async () => {
    const t = io();
    expect(await main([], t.io, {})).toBe(2);
    expect(t.err.join('')).toContain('usage');
  });

  it('succeeds on a build and reports the page count', async () => {
    buildFixture();
    const t = io();
    expect(await main([dist], t.io, {})).toBe(0);
    expect(t.out.join('')).toContain('(4 pages)');
  });

  it('honours SITE_URL from the environment', async () => {
    buildFixture();
    const t = io();
    expect(await main([dist], t.io, { SITE_URL: 'https://env.example.test' })).toBe(0);
    expect(readFileSync(join(dist, 'robots.txt'), 'utf8')).toContain('https://env.example.test/sitemap.xml');
  });

  it('returns 1 with the error message on failure', async () => {
    put('index.html');
    const t = io();
    expect(await main([dist], t.io, {})).toBe(1);
    expect(t.err.join('')).toContain('seo: prerendered 404 page is missing');
  });
});
