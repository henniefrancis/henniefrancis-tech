// Generates e2e/visual/routes.json from the site's data modules.
// Run: node e2e/visual/gen-routes.mjs  (from the repo root)
// Static routes are listed here; event, gallery and certificate routes are
// read from the keys of EVENTS, GALLERIES and CERT_DETAILS.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const app = join(root, 'src', 'src', 'app');

const STATIC = [
  '/',
  '/biography',
  '/current-role',
  '/portfolio',
  '/portfolio/cv',
  '/portfolio/career-history',
  '/portfolio/projects',
  '/social-media',
  '/public-speaking',
  '/blog',
  '/tech-stack',
  '/certifications',
  '/special-awards',
];

const read = (rel) => readFileSync(join(app, rel), 'utf8');

/** Keys of the exported map, matched as quoted strings at the start of a line. */
function mapKeys(source, exportName) {
  const start = source.indexOf(`export const ${exportName}`);
  if (start < 0) throw new Error(`export ${exportName} not found`);
  const body = source.slice(start);
  const keys = [];
  for (const m of body.matchAll(/^\s+["']([^"']+)["']\s*:/gm)) keys.push(m[1]);
  return keys;
}

const events = mapKeys(read('public-speaking/data/events.data.ts'), 'EVENTS').map(
  (k) => `/public-speaking/${k}`,
);
const galleries = mapKeys(read('public-speaking/data/galleries.data.ts'), 'GALLERIES').map((k) => {
  const [event, edition] = k.split('/');
  return `/public-speaking/${event}/photos/${edition}`;
});
const certs = mapKeys(
  read('certifications/cert-detail/cert-details.data.ts'),
  'CERT_DETAILS',
).map((k) => `/certifications/microsoft/${k}`);

const routes = [...STATIC, ...events, ...galleries, ...certs];
if (new Set(routes).size !== routes.length) throw new Error('duplicate routes');
writeFileSync(
  join(root, 'e2e', 'visual', 'routes.json'),
  JSON.stringify({ static: STATIC.length, events: events.length, galleries: galleries.length, certs: certs.length, routes }, null, 2) + '\n',
);
console.log(`routes: ${routes.length} (static ${STATIC.length}, events ${events.length}, galleries ${galleries.length}, certs ${certs.length})`);
