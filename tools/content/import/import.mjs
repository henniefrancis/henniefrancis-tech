// One-off import of the pre-extraction site content into the YAML config tree.
// Usage: node tools/content/import/import.mjs --site <pre-extraction checkout> --out <config repo> [--recovered <dir>]
// Reads the old data files, components and templates; writes <out>/content/**. Never writes into the site.
import { copyFileSync, existsSync, readFileSync, readdirSync, mkdirSync, rmSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import { parseArgs } from 'node:util';
import { attr, clean, elements, extractArray, hasClass, parseHtml, slugify, textOf, toYaml, writeFile } from './lib.mjs';
import { importCareer, importCv } from './cv-career.mjs';

const { values } = parseArgs({ options: { site: { type: 'string' }, out: { type: 'string' }, recovered: { type: 'string' } } });
if (!values.site || !values.out) throw new Error('usage: import.mjs --site <dir> --out <dir> [--recovered <dir>]');
const SITE = join(values.site, 'src', 'app');
const OUT = values.out;
const read = (rel) => readFileSync(join(SITE, rel), 'utf8');
const json = (rel) => JSON.parse(read(rel));

rmSync(join(OUT, 'content'), { recursive: true, force: true });

// ---- shared helpers -------------------------------------------------------------------------
const rootBase = json('public-speaking/data/events/aws-summit__2026.json').assetBaseUrl; // site image root
const imagePath = (fullUrl) => {
  if (!fullUrl.startsWith(rootBase)) throw new Error('image outside the image root');
  return `images/${fullUrl.slice(rootBase.length)}`;
};
const img = (base, file, alt) => ({ src: imagePath(base + file), alt });
const tokens = (text) =>
  text
    .replace(/\b4x AWS Certified\b/g, '${aws-certifications}x AWS Certified')
    .replace(/\b19x Microsoft Certified\b/g, '${microsoft-certifications}x Microsoft Certified')
    .replace(/\b4 AWS Certifications\b/g, '${aws-certifications} AWS Certifications')
    .replace(/\b19 Microsoft Certifications\b/g, '${microsoft-certifications} Microsoft Certifications');
const byOrder = (a, b) => (a.order ?? 999) - (b.order ?? 999);
const asHttps = (url) => url.replace(/^http:\/\//, 'https://');

const routesSource = read('app.routes.ts');
const titles = {};
for (const m of routesSource.matchAll(/path: '([^']*)', component: \w+, title: (?:'([^']*)'|"([^"]*)")/g)) titles[m[1]] = m[2] ?? m[3];
const page = (key, path, html) => {
  const dom = parseHtml(html);
  const els = elements(dom);
  const h1 = els.find((e) => e.tagName === 'h1');
  const crumb = els.find((e) => e.tagName === 'li' && hasClass(e, 'current'));
  return { title: titles[path], heading: clean(textOf(h1)), breadcrumb: clean(textOf(crumb)) };
};
const pageFile = (key, data, opts) => writeFile(OUT, `content/pages/${key}.yaml`, toYaml(data, { comment: ` ${key} page content. Edit the text; keep the field names.`, ...opts }));

// ---- site.yaml ------------------------------------------------------------------------------
const footer = clean(textOf(elements(parseHtml(read('app.html'))).find((e) => e.tagName === 'p')));
writeFile(OUT, 'content/site.yaml', toYaml({ name: 'Hennie Francis', copyright: footer, imageBaseUrl: rootBase, features: { expiredLabels: false } }, { comment: ' Site wide settings. imageBaseUrl is the legacy image location until the image pipeline lands.' }));

// ---- home --------------------------------------------------------------------------------
{
  const html = read('home/home.html');
  const ts = read('home/home.ts');
  const homeBase = ts.match(/imageBase =\s*'([^']+)'/)[1];
  const bio = elements(parseHtml(html)).find((e) => e.tagName === 'div' && hasClass(e, 'bio'));
  const ps = bio.childNodes.filter((n) => n.tagName === 'p');
  const tagline = ps[0].childNodes.filter((n) => n.nodeName === '#text').map((n) => clean(n.value)).filter(Boolean);
  const tiles = extractArray(ts, 'protected readonly tiles: Tile[] = [').map((t) => ({ name: t.name, route: t.route, image: img(homeBase, t.image, t.name) }));
  pageFile(
    'home',
    {
      title: titles[''],
      heading: clean(textOf(bio.childNodes.find((n) => n.tagName === 'h3'))),
      profile: img(homeBase, 'profile.png', 'Profile Picture'),
      tagline: tagline.map(tokens),
      about: ps.slice(1).map((p) => clean(textOf(p))),
      tiles,
    },
    { blocks: ['about'] },
  );
}

// ---- biography ---------------------------------------------------------------------------
{
  const ts = read('biography/biography.ts');
  const portrait = ts.match(/portrait =\s*'([^']+)'/)[1];
  pageFile(
    'biography',
    { ...page('biography', 'biography', read('biography/biography.html')), portrait: { src: imagePath(portrait), alt: 'Portrait' }, paragraphs: extractArray(ts, 'paragraphs: string[] = [').map(tokens) },
    { blocks: ['paragraphs'] },
  );
}

// ---- portfolio ---------------------------------------------------------------------------
{
  const ts = read('portfolio/portfolio.ts');
  const indexBase = ts.match(/INDEX =\s*'([^']+)'/)[1];
  const tiles = [...ts.matchAll(/name: '([^']+)', route: '([^']+)', src: INDEX \+ '([^']+)'/g)].map((m) => ({ name: m[1], route: m[2], image: img(indexBase, m[3], m[1]) }));
  pageFile('portfolio', { ...page('portfolio', 'portfolio', read('portfolio/portfolio.html')), tiles });
}

// ---- projects, blog -------------------------------------------------------------------
{
  const html = read('portfolio/projects/projects.html');
  const els = elements(parseHtml(html));
  const name = clean(textOf(els.find((e) => e.tagName === 'h2')));
  const badge = clean(textOf(els.find((e) => e.tagName === 'span' && hasClass(e, 'badge'))));
  const description = clean(textOf(els.find((e) => e.tagName === 'p')));
  const image = els.find((e) => e.tagName === 'img');
  pageFile(
    'projects',
    { ...page('projects', 'portfolio/projects', html), projects: [{ name, badge, description: [description], diagram: { src: imagePath(attr(image, 'src')), alt: attr(image, 'alt') } }] },
    { blocks: ['description'] },
  );
}
{
  const ts = read('blog/blog.ts');
  const html = read('blog/blog.html');
  const social = ts.match(/SOCIAL =\s*'([^']+)'/)[1];
  const links = [...ts.matchAll(/name: '([^']+)', url: '([^']+)', src: SOCIAL \+ '([^']+)'/g)].map((m) => ({ name: m[1], url: asHttps(m[2]), image: img(social, m[3], m[1]) }));
  const intro = clean(textOf(elements(parseHtml(html)).find((e) => e.tagName === 'p')));
  pageFile('blog', { ...page('blog', 'blog', html), intro, links });
}

// ---- current role ------------------------------------------------------------------------
{
  const data = json('current-role/current-role.json');
  const reserved = new Set(['version', 'imageBaseUrl', 'images']);
  const logo = data.images[0];
  pageFile('current-role', {
    ...page('current-role', 'current-role', read('current-role/current-role.html')),
    enabled: false,
    logo: { url: logo.url, image: img(data.imageBaseUrl, logo.image, logo.name) },
    facts: Object.entries(data).filter(([k, v]) => !reserved.has(k) && typeof v === 'string' && v.trim() !== '').map(([label, value]) => ({ label, value })),
  });
}

// ---- social media ------------------------------------------------------------------------
{
  const data = json('social-media/social.json');
  const items = data.items.slice().sort(byOrder).map((i) => ({ name: i.name, url: asHttps(i.url), image: img(data.imageBaseUrl, i.image, i.name) }));
  pageFile('social-media', { ...page('social-media', 'social-media', read('social-media/social-media.html')), categories: [{ items }] });
}

// ---- tech stack -------------------------------------------------------------------------
{
  const data = json('tech-stack/tech-stack.json');
  const categories = data.categories.slice().sort(byOrder).map((c) => ({
    name: c.name,
    items: c.items.slice().sort(byOrder).map((i) => ({ name: i.name, url: asHttps(i.url), image: img(data.imageBaseUrl, i.image, i.name) })),
  }));
  pageFile('tech-stack', { ...page('tech-stack', 'tech-stack', read('tech-stack/tech-stack.html')), categories });
}

// ---- special awards ---------------------------------------------------------------------
{
  const ts = read('special-awards/special-awards.ts');
  const awards = ts.match(/AWARDS =\s*'([^']+)'/)[1];
  const slides = [...ts.matchAll(/src: AWARDS \+ '([^']+)', alt: '([^']+)'/g)].map((m) => img(awards, m[1], m[2]));
  pageFile('special-awards', { ...page('special-awards', 'special-awards', read('special-awards/special-awards.html')), slides });
}

// ---- certifications ---------------------------------------------------------------------
const MS_DETAIL_TYPES = { mcts: 'Microsoft Certified Technology Specialist', mcpd: 'Microsoft Certified Professional Developer', mcitp: 'Microsoft Certified IT Professional', mct: 'Microsoft Certified Trainer' };
{
  const data = json('certifications/certifications.json');
  const used = new Set();
  const categories = [];
  for (const cat of data.categories.slice().sort(byOrder)) {
    const slugs = [];
    for (const item of cat.items.slice().sort(byOrder)) {
      const stem = slugify(item.name || basename(item.image, extname(item.image)));
      let slug = stem;
      for (let n = 2; used.has(slug); n++) slug = `${stem}-${n}`;
      used.add(slug);
      slugs.push(slug);
      const vendor = cat.name.startsWith('AWS') ? 'aws' : cat.name.startsWith('Microsoft') ? 'microsoft' : cat.name.startsWith('MongoDB') ? 'mongodb' : 'other';
      let kind = 'extra-badge';
      if (cat.name === 'AWS Partner') kind = 'partner-badge';
      else if (cat.name === 'AWS Certified') kind = /Early Adopter/.test(item.name) ? 'extra-badge' : 'certification';
      else if (vendor === 'microsoft' || vendor === 'mongodb') kind = 'certification';
      const out = { name: item.name, vendor, kind, status: item.status };
      if (/^https?:/.test(item.url)) out.url = asHttps(item.url);
      else {
        const [, type, id] = item.url.match(/microsoft\/([a-z]+)\/([A-Za-z0-9-]+)\.html$/);
        out.detail = { type, id };
      }
      if (cat.name === 'Microsoft Certified Trainer') out.countAs = 'mct';
      out.image = img(data.imageBaseUrl, item.image, item.name);
      writeFile(OUT, `content/certifications/items/${slug}.yaml`, toYaml(out));
    }
    categories.push({ name: cat.name, items: slugs });
  }
  writeFile(OUT, 'content/certifications/categories.yaml', toYaml({ categories }, { comment: ' Ordered categories. Each lists item slugs, newest first.' }));
  writeFile(OUT, 'content/certifications/detail-types.yaml', toYaml({ types: Object.entries(MS_DETAIL_TYPES).map(([id, name]) => ({ id, name })) }));
  const details = read('certifications/cert-detail/cert-details.data.ts');
  for (const m of details.matchAll(/"([a-z]+)\/([A-Za-z0-9-]+)": \{ title: "([^"]+)", image: "([^"]+)" \}/g)) {
    writeFile(OUT, `content/certifications/details/${m[1]}/${m[2]}.yaml`, toYaml({ title: m[3], image: { src: imagePath(m[4]), alt: m[3] } }));
  }
  pageFile('certifications', page('certifications', 'certifications', read('certifications/certifications.html')));
}

// ---- public speaking --------------------------------------------------------------------
{
  const index = json('public-speaking/public-speaking.json');
  const listing = {};
  const years = index.categories.slice().sort(byOrder).map((c) => ({
    name: c.name,
    events: c.items.slice().sort(byOrder).map((i) => {
      const key = i.url.replace('../pages/public-speaking/', '').replace(/\.html$/, '');
      listing[key] = { name: i.name, image: img(index.imageBaseUrl, i.image, i.name) };
      return key;
    }),
  }));
  const eventDir = join(SITE, 'public-speaking', 'data', 'events');
  for (const file of readdirSync(eventDir).sort()) {
    const d = JSON.parse(readFileSync(join(eventDir, file), 'utf8'));
    const key = file.replace(/\.json$/, '').replace('__', '/');
    const out = { title: d.title, year: d.year, listing: listing[key] };
    if (d.header) out.header = { url: d.header.url, image: img(d.assetBaseUrl, d.header.image, d.header.alt || d.title) };
    if (d.heading) out.heading = d.heading;
    if (d.body?.length) out.body = d.body;
    out.links = (d.links ?? []).map((l) => {
      const link = { title: l.title };
      if (l.label) link.label = l.label;
      link.image = img(d.assetBaseUrl, l.image, l.alt || l.title);
      if (/^https?:/.test(l.url)) link.url = asHttps(l.url);
      else if (/^photos\//.test(l.url)) link.gallery = true;
      return link;
    });
    writeFile(OUT, `content/speaking/events/${key}.yaml`, toYaml(out, { blocks: ['body'] }));
  }
  const galDir = join(SITE, 'public-speaking', 'data', 'galleries');
  const galleryImports = readFileSync(join(SITE, 'public-speaking', 'data', 'galleries.data.ts'), 'utf8');
  for (const m of galleryImports.matchAll(/from '\.\/galleries\/([^']+)\.json'/g)) {
    const d = JSON.parse(readFileSync(join(galDir, `${m[1]}.json`), 'utf8'));
    const key = m[1].replace('__', '/');
    writeFile(OUT, `content/speaking/galleries/${key}.yaml`, toYaml({ title: d.title, year: d.year, photos: d.photos.map((p) => img(d.assetBaseUrl, d.photoBase + p.image, p.alt)) }));
  }
  pageFile('public-speaking', { ...page('public-speaking', 'public-speaking', read('public-speaking/public-speaking.html')), years });
}

// ---- CV and career history ------------------------------------------------------------
importCv({ read, page, pageFile, tokens });
importCareer({ read, page, pageFile });

// ---- recovered Microsoft certificate images -------------------------------------------------
if (values.recovered) {
  const walk = (dir, rel) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walk(join(dir, e.name), `${rel}/${e.name}`);
      else {
        const target = join(OUT, 'content', 'images', 'certifications', rel, e.name);
        mkdirSync(dirname(target), { recursive: true });
        copyFileSync(join(dir, e.name), target);
      }
    }
  };
  if (existsSync(values.recovered)) walk(values.recovered, 'microsoft/certificates');
}
console.log('import: done');
