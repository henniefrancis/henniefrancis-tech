// Validates a loaded content tree: JSON Schema per file, then cross-file checks.
// Errors are { file, pointer, rule } only. Values are never reported, so nothing from the content leaks
// into build logs.
import { PAGE_KEYS, recordKey, routeList } from './routes.mjs';
import { getSchemas } from './schemas.mjs';
import { hasBadToken, walkStrings } from './tokens.mjs';

const SLUG = '[a-z0-9]+(?:-[a-z0-9]+)*';
const EDITION = '[0-9]{4}(?:-[a-z0-9]+)*';
const FILE_RULES = [
  { re: /^site\.yaml$/, schema: () => 'site' },
  { re: new RegExp(`^pages/(${PAGE_KEYS.join('|')})\\.yaml$`), schema: (m) => `page-${m[1]}` },
  { re: /^certifications\/categories\.yaml$/, schema: () => 'cert-categories' },
  { re: /^certifications\/detail-types\.yaml$/, schema: () => 'cert-detail-types' },
  { re: new RegExp(`^certifications/items/${SLUG}\\.yaml$`), schema: () => 'cert-item' },
  { re: new RegExp(`^certifications/details/${SLUG}/[A-Za-z0-9-]{8,64}\\.yaml$`), schema: () => 'cert-detail' },
  { re: new RegExp(`^speaking/events/${SLUG}/${EDITION}\\.yaml$`), schema: () => 'event' },
  { re: new RegExp(`^speaking/galleries/${SLUG}/${EDITION}\\.yaml$`), schema: () => 'gallery' },
];
const REQUIRED_FILES = ['site.yaml', ...PAGE_KEYS.map((k) => `pages/${k}.yaml`), 'certifications/categories.yaml', 'certifications/detail-types.yaml'];

/** Find the schema for a content file path, or undefined when the path is not part of the contract. */
export function schemaFor(path) {
  for (const rule of FILE_RULES) {
    const match = rule.re.exec(path);
    if (match) return rule.schema(match);
  }
  return undefined;
}

function schemaErrors(file, validate, data) {
  if (validate(data)) return [];
  return validate.errors.map((e) => {
    let pointer = e.instancePath;
    if (e.keyword === 'required') pointer += `/${e.params.missingProperty}`;
    if (e.keyword === 'additionalProperties') pointer += `/${e.params.additionalProperty}`;
    if (e.keyword === 'unevaluatedProperties') pointer += `/${e.params.unevaluatedProperty}`;
    return { file, pointer, rule: e.keyword };
  });
}

const asArray = (value) => (Array.isArray(value) ? value : []);
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Item files by slug, and the slug of a path like certifications/items/<slug>.yaml. */
function itemsOf(files) {
  const out = {};
  for (const [path, data] of Object.entries(files)) {
    if (path.startsWith('certifications/items/')) out[recordKey(path, 'certifications/items')] = data;
  }
  return out;
}

function checkCertifications(files, archive, add) {
  const items = itemsOf(files);
  const detailTypes = new Set(asArray(files['certifications/detail-types.yaml']?.types).map((t) => t.id));
  const expiredLabels = files['site.yaml']?.features?.expiredLabels === true;
  const listed = new Map();
  const categories = asArray(files['certifications/categories.yaml']?.categories);
  categories.forEach((category, ci) =>
    asArray(category?.items).forEach((slug, ii) => {
      const pointer = `/categories/${ci}/items/${ii}`;
      if (!(slug in items)) add('certifications/categories.yaml', pointer, 'unknown-item');
      if (listed.has(slug)) add('certifications/categories.yaml', pointer, 'item-listed-twice');
      listed.set(slug, true);
    }),
  );
  for (const [slug, item] of Object.entries(items)) {
    const file = `certifications/items/${slug}.yaml`;
    if (!listed.has(slug)) add(file, '', 'item-not-listed');
    if (item.countAs !== undefined && item.kind !== 'certification') add(file, '/countAs', 'count-as-needs-certification');
    if ((item.status === 'expired' || item.status === 'retired') && !expiredLabels) add(file, '/status', 'expired-labels-disabled');
    if (isObject(item.detail)) {
      if (!detailTypes.has(item.detail.type)) add(file, '/detail/type', 'unknown-detail-type');
      if (!(`certifications/details/${item.detail.type}/${item.detail.id}.yaml` in files)) add(file, '/detail', 'unknown-detail');
    }
    asArray(item.evidence).forEach((path, i) => {
      if (!archive.includes(path)) add(file, `/evidence/${i}`, 'evidence-missing');
    });
  }
}

function checkSpeaking(files, add) {
  const events = new Set();
  const galleries = new Set();
  for (const path of Object.keys(files)) {
    if (path.startsWith('speaking/events/')) {
      const key = recordKey(path, 'speaking/events');
      events.add(key);
    } else if (path.startsWith('speaking/galleries/')) {
      const key = recordKey(path, 'speaking/galleries');
      galleries.add(key);
    }
  }
  for (const key of galleries) {
    if (!events.has(key)) add(`speaking/galleries/${key}.yaml`, '', 'gallery-without-event');
  }
  const listed = new Set();
  asArray(files['pages/public-speaking.yaml']?.years).forEach((year, yi) =>
    asArray(year?.events).forEach((ref, ei) => {
      const pointer = `/years/${yi}/events/${ei}`;
      if (!events.has(ref)) add('pages/public-speaking.yaml', pointer, 'unknown-event');
      if (listed.has(ref)) add('pages/public-speaking.yaml', pointer, 'event-listed-twice');
      listed.add(ref);
    }),
  );
  for (const key of events) {
    if (!listed.has(key)) add(`speaking/events/${key}.yaml`, '', 'event-not-listed');
  }
}

function checkRoutes(files, add) {
  const routes = new Set(routeList(files));
  const homeTiles = asArray(files['pages/home.yaml']?.tiles);
  const portfolioTiles = asArray(files['pages/portfolio.yaml']?.tiles);
  const check = (file, tiles) =>
    tiles.forEach((tile, i) => {
      if (tile?.route && !routes.has(tile.route)) add(file, `/tiles/${i}/route`, 'unknown-route');
    });
  check('pages/home.yaml', homeTiles);
  check('pages/portfolio.yaml', portfolioTiles);
}

const isImageRef = (value) => Array.isArray(value.widths) && 'id' in value && 'w' in value;

/** Every image reference: widths ascending, and the widest variant is the declared size (w). */
function checkImages(files, add) {
  const visit = (value, file, pointer) => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, file, `${pointer}/${index}`));
    } else if (isObject(value) && isImageRef(value)) {
      const widths = value.widths;
      if (!widths.every((width, i) => i === 0 || width > widths[i - 1])) add(file, `${pointer}/widths`, 'image-widths-not-ascending');
      else if (widths[widths.length - 1] !== value.w) add(file, `${pointer}/widths`, 'image-widest-variant-differs-from-w');
    } else if (isObject(value)) {
      for (const [key, item] of Object.entries(value)) visit(item, file, `${pointer}/${key}`);
    }
  };
  for (const [file, data] of Object.entries(files)) visit(data, file, '');
}

function checkTokens(files, add) {
  for (const [file, data] of Object.entries(files)) {
    walkStrings(data, (text, pointer) => {
      if (hasBadToken(text)) add(file, pointer, 'bad-token');
    });
  }
}

/**
 * Validate a tree returned by loadTree. Returns a sorted list of unique { file, pointer, rule }.
 * @param {{files: Record<string, any>, images?: string[], archive?: string[], errors?: any[]}} tree
 */
export function validateTree(tree) {
  const seen = new Set();
  const errors = [];
  const add = (file, pointer, rule) => {
    const key = `${file}\u0000${pointer}\u0000${rule}`;
    if (!seen.has(key)) {
      seen.add(key);
      errors.push({ file, pointer, rule });
    }
  };
  for (const e of tree.errors ?? []) add(e.file, e.pointer, e.rule);

  const schemas = getSchemas();
  const { files } = tree;
  for (const path of REQUIRED_FILES) {
    if (!(path in files)) add(path, '', 'missing-file');
  }
  for (const [path, data] of Object.entries(files)) {
    const name = schemaFor(path);
    if (name === undefined) {
      add(path, '', 'unexpected-file');
      continue;
    }
    for (const e of schemaErrors(path, schemas.get(name), data)) add(e.file, e.pointer, e.rule);
  }
  // Cross-file checks only see object files, so one malformed file does not hide the rest.
  const sound = Object.fromEntries(Object.entries(files).filter(([, v]) => isObject(v)));
  checkCertifications(sound, tree.archive ?? [], add);
  checkSpeaking(sound, add);
  checkRoutes(sound, add);
  checkImages(sound, add);
  checkTokens(sound, add);
  return errors.sort((a, b) => (a.file + a.pointer + a.rule).localeCompare(b.file + b.pointer + b.rule));
}

/**
 * Findings that do not fail the build but that the owner should know about. Same shape as errors.
 * edition-year-mismatch: the edition id does not start with the year label.
 * gallery-link-without-gallery: an event links to photos that do not exist (the link falls back to home).
 */
export function lintTree(tree) {
  const warnings = [];
  const files = Object.fromEntries(Object.entries(tree.files).filter(([, v]) => isObject(v)));
  for (const [path, data] of Object.entries(files)) {
    const speaking = path.startsWith('speaking/events/') || path.startsWith('speaking/galleries/');
    if (speaking && typeof data.year === 'string') {
      const edition = path.split('/')[3].replace('.yaml', '');
      if (!edition.startsWith(data.year.slice(0, 4))) warnings.push({ file: path, pointer: '/year', rule: 'edition-year-mismatch' });
    }
    if (path.startsWith('speaking/events/')) {
      const gallery = path.replace('speaking/events/', 'speaking/galleries/');
      asArray(data.links).forEach((link, i) => {
        if (link?.gallery === true && !(gallery in files)) warnings.push({ file: path, pointer: `/links/${i}/gallery`, rule: 'gallery-link-without-gallery' });
      });
    }
  }
  return warnings.sort((a, b) => (a.file + a.pointer).localeCompare(b.file + b.pointer));
}

/** "1 error", "2 errors". */
export const countLabel = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** One line per error: file, pointer, rule. */
export function formatErrors(errors) {
  return errors.map((e) => `${e.file} ${e.pointer || '/'} ${e.rule}`).join('\n');
}
