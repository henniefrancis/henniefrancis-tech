// Writes manifest.json for a baseline folder and prints a summary.
// Run: node e2e/visual/make-manifest.mjs [baselineDir] [baseUrl]
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dir = process.argv[2] ?? join(here, 'baseline');
const baseUrl = process.argv[3] ?? 'https://henniefrancis.tech';
const routes = JSON.parse(readFileSync(join(here, 'routes.json'), 'utf8')).routes;
const projects = readdirSync(dir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const slug = (r) => (r === '/' ? 'home' : r.replace(/^\//, '').replace(/\//g, '__'));
const pages = [];
const missing = [];
let first = '9999';
let last = '0000';
for (const project of projects) {
  for (const route of routes) {
    const base = join(dir, project, slug(route));
    const files = ['page.png', 'geometry.json', 'text.txt', 'meta.json'];
    if (!files.every((f) => existsSync(join(base, f)))) {
      missing.push(`${project} ${route}`);
      continue;
    }
    const meta = JSON.parse(readFileSync(join(base, 'meta.json'), 'utf8'));
    const geo = JSON.parse(readFileSync(join(base, 'geometry.json'), 'utf8'));
    pages.push({
      project,
      route,
      status: meta.status,
      finalPath: meta.finalPath,
      elements: geo.elements.length,
      texts: geo.texts.length,
      images: geo.images.length,
      badResponses: meta.badResponses ?? [],
    });
    if (meta.capturedAt < first) first = meta.capturedAt;
    if (meta.capturedAt > last) last = meta.capturedAt;
  }
}

const playwright = JSON.parse(
  readFileSync(join(here, '..', '..', 'node_modules', '@playwright', 'test', 'package.json'), 'utf8'),
).version;
const manifest = {
  baseUrl,
  playwright,
  node: process.version,
  deviceScaleFactor: Number(process.env.E2E_DSF ?? '1'),
  capturedFrom: first,
  capturedTo: last,
  projects,
  routeCount: routes.length,
  pageCount: pages.length,
  missing,
  withBadResponses: pages.filter((p) => p.badResponses.length).map((p) => `${p.project} ${p.route}: ${p.badResponses.join(', ')}`),
  nonOk: pages.filter((p) => p.status !== 200).map((p) => `${p.project} ${p.route} ${p.status}`),
  pages,
};
writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(
  `projects ${projects.length}, routes ${routes.length}, pages captured ${pages.length}, missing ${missing.length}, non-200 ${manifest.nonOk.length}`,
);
if (missing.length) console.log('missing:', missing.slice(0, 10).join('; '));
console.log(`pages with bad responses: ${manifest.withBadResponses.length}`);
const kinds = new Map();
for (const w of manifest.withBadResponses) for (const b of w.split(': ')[1].split(', ')) kinds.set(b, (kinds.get(b) ?? 0) + 1);
for (const [k, n] of [...kinds].slice(0, 20)) console.log(`  ${n}x ${k}`);
if (manifest.nonOk.length) console.log('non-200:', manifest.nonOk.slice(0, 10).join('; '));
console.log(`window ${first} to ${last}; playwright ${playwright}`);
