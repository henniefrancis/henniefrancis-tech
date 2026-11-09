import { readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const DEFAULT_SITE_URL = 'https://henniefrancis.tech';
/** Routes left out of the sitemap (Current Role stays off; the 404 page is not a page). */
export const EXCLUDED_ROUTES = new Set(['/current-role', '/404']);

/** Accepts an https origin without path or trailing slash; throws a clear error otherwise. */
export function parseSiteUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('SITE_URL is not a valid URL');
  }
  if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || url.username) {
    throw new Error('SITE_URL must be an https origin with no path, query or credentials');
  }
  return url.origin;
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/** Route paths of every prerendered page: a directory holding index.html, plus "/" for the root. */
export async function findRoutes(dist, dir = '') {
  const routes = [];
  const here = join(dist, dir);
  if (await exists(join(here, 'index.html'))) routes.push(dir === '' ? '/' : `/${dir}`);
  for (const entry of await readdir(here, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      routes.push(...(await findRoutes(dist, dir === '' ? entry.name : `${dir}/${entry.name}`)));
    }
  }
  return routes;
}

export function escapeXml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

/** Absolute address of a route: no trailing slash, except for the home page. */
export function absoluteUrl(siteUrl, route) {
  return route === '/' ? `${siteUrl}/` : `${siteUrl}${route}`;
}

export function buildSitemap(siteUrl, routes) {
  const urls = routes
    .filter((r) => !EXCLUDED_ROUTES.has(r))
    .sort()
    .map((r) => `  <url><loc>${escapeXml(absoluteUrl(siteUrl, r))}</loc></url>`);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}

export function buildRobots(siteUrl) {
  return `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
}

/**
 * Post-build step. Moves the prerendered 404 page to 404.html (and removes the
 * 404 folder, which is not a real page), then writes robots.txt and sitemap.xml.
 * Returns the routes listed in the sitemap.
 */
export async function run(dist, siteUrl = DEFAULT_SITE_URL) {
  const origin = parseSiteUrl(siteUrl);
  const notFound = join(dist, '404', 'index.html');
  if (!(await exists(notFound))) throw new Error('prerendered 404 page is missing (404/index.html)');
  await rename(notFound, join(dist, '404.html'));
  await rm(join(dist, '404'), { recursive: true, force: true });

  const routes = (await findRoutes(dist)).filter((r) => !EXCLUDED_ROUTES.has(r)).sort();
  await writeFile(join(dist, 'sitemap.xml'), buildSitemap(origin, routes));
  await writeFile(join(dist, 'robots.txt'), buildRobots(origin));
  return routes;
}

/** CLI: node tools/seo/cli.mjs <distDir>. SITE_URL overrides the default origin. */
export async function main(args, io, env = process.env) {
  if (args.length !== 1) {
    io.err('usage: node tools/seo/cli.mjs <distDir>\n');
    return 2;
  }
  try {
    const routes = await run(args[0], env.SITE_URL ?? DEFAULT_SITE_URL);
    io.out(`seo: wrote 404.html, robots.txt and sitemap.xml (${routes.length} pages)\n`);
    return 0;
  } catch (e) {
    io.err(`seo: ${e.message}\n`);
    return 1;
  }
}
