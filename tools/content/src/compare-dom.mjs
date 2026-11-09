// DOM equivalence between two prerendered builds.
// Parses every HTML file, drops comments, Angular generated attributes and hashed asset names, normalises
// whitespace, then compares the element tree, attributes and text.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'parse5';

const GENERATED_ATTRS = [/^_ngcontent-/, /^_nghost-/, /^ng-reflect-/, /^ng-version$/, /^ng-server-context$/, /^ngh$/, /^ng-app-id$/];
const HASHED = /-[A-Z0-9]{8}(?=\.[a-z0-9]+)/g;
const NG_SCOPE = /ng-c\d+/g;
/** Script hashes in the content security policy change with every build (the loader names hashed chunks). */
const SCRIPT_HASH = /'sha256-[A-Za-z0-9+/=]+'/g;
/** Preload hints for lazy chunks differ with the chunking; they are not page content. */
const isPreload = (node) => node.nodeName === 'link' && node.attrs.some((a) => a.name === 'rel' && a.value === 'modulepreload');
const isNgState = (node) => node.nodeName === 'script' && node.attrs.some((a) => a.name === 'id' && a.value === 'ng-state');

const normaliseValue = (value) => value.replace(HASHED, '-HASH').replace(NG_SCOPE, 'ng-c').replace(SCRIPT_HASH, "'sha256-HASH'");
const squash = (text) => text.replace(/\s+/g, ' ').trim();
const collapse = (text) => text.replace(/\s+/g, ' ');

const INLINE = new Set(['a', 'b', 'i', 'em', 'strong', 'span', 'sub', 'sup', 'small', 'label', 'code']);

/**
 * Moves collapsible spaces to where they render the same either way: a space at the edge of an inline
 * element is the same as a space just outside it, and spaces next to a line break do not render.
 */
function settleSpaces(children) {
  const out = [];
  const pushText = (text) => {
    if (text === '') return;
    if (typeof out.at(-1) === 'string') out[out.length - 1] = collapse(`${out.at(-1)}${text}`);
    else out.push(text);
  };
  for (const node of children) {
    if (typeof node === 'string') {
      pushText(node);
    } else if (INLINE.has(node.t)) {
      let lead = '';
      let trail = '';
      if (typeof node.c[0] === 'string' && node.c[0].startsWith(' ')) {
        node.c[0] = node.c[0].slice(1);
        lead = ' ';
      }
      if (typeof node.c.at(-1) === 'string' && node.c.at(-1).endsWith(' ')) {
        node.c[node.c.length - 1] = node.c.at(-1).slice(0, -1);
        trail = ' ';
      }
      node.c = node.c.filter((c) => c !== '');
      pushText(lead);
      out.push(node);
      pushText(trail);
    } else {
      out.push(node);
    }
  }
  out.forEach((node, i) => {
    if (typeof node !== 'string' && node.t === 'br') {
      if (typeof out[i - 1] === 'string') out[i - 1] = out[i - 1].trimEnd();
      if (typeof out[i + 1] === 'string') out[i + 1] = out[i + 1].trimStart();
    }
  });
  children.splice(0, children.length, ...out);
}

/** Convert a parse5 node into a plain comparable tree. Text nodes become strings. */
export function normaliseNode(node) {
  const children = [];
  for (const child of node.childNodes ?? []) {
    if (child.nodeName === '#comment' || isPreload(child)) continue;
    if (child.nodeName === '#text') {
      // The Angular transfer state holds template ids that change whenever a template changes.
      const text = isNgState(node) ? '[ng-state]' : normaliseValue(collapse(child.value));
      if (typeof children.at(-1) === 'string') children[children.length - 1] = collapse(`${children.at(-1)}${text}`);
      else children.push(text);
    } else {
      children.push(normaliseNode(child));
    }
  }
  const attrs = {};
  for (const { name, value } of (node.attrs ?? []).slice().sort((a, b) => a.name.localeCompare(b.name))) {
    if (!GENERATED_ATTRS.some((re) => re.test(name))) attrs[name] = normaliseValue(name === 'class' ? squash(value) : value);
  }
  settleSpaces(children);
  // Spaces next to elements are kept (they render); spaces at the edges of an element are not.
  if (!INLINE.has(node.nodeName)) {
    if (typeof children[0] === 'string') children[0] = children[0].trimStart();
    if (typeof children.at(-1) === 'string') children[children.length - 1] = children.at(-1).trimEnd();
  }
  const kept = children.filter((c) => c !== '');
  children.length = 0;
  children.push(...kept);
  // <template> content lives outside childNodes in parse5.
  const content = node.content ? normaliseNode(node.content).c : [];
  return { t: node.nodeName, a: attrs, c: [...children, ...content] };
}

export const normaliseHtml = (html) => normaliseNode(parse(html));

const describe = (n) => (typeof n === 'string' ? `text "${n.slice(0, 80)}"` : `<${n.t}>`);

/** Differences between two normalised trees. Each is { path, what, before, after }. */
export function diffTrees(a, b, path = '', out = [], limit = 25) {
  if (out.length >= limit) return out;
  if (typeof a === 'string' || typeof b === 'string') {
    if (a !== b) out.push({ path, what: 'node', before: describe(a), after: describe(b) });
    return out;
  }
  if (a.t !== b.t) {
    out.push({ path, what: 'tag', before: describe(a), after: describe(b) });
    return out;
  }
  const here = `${path}/${a.t}`;
  for (const name of new Set([...Object.keys(a.a), ...Object.keys(b.a)])) {
    if (a.a[name] !== b.a[name]) {
      out.push({ path: here, what: `attribute ${name}`, before: String(a.a[name]).slice(0, 120), after: String(b.a[name]).slice(0, 120) });
    }
  }
  if (a.c.length !== b.c.length) out.push({ path: here, what: 'child-count', before: String(a.c.length), after: String(b.c.length) });
  const shared = Math.min(a.c.length, b.c.length);
  for (let i = 0; i < shared; i++) diffTrees(a.c[i], b.c[i], `${here}[${i}]`, out, limit);
  return out;
}

/** All .html files below a directory, as posix paths relative to it. */
export function htmlFiles(dir, rel = '') {
  const found = [];
  for (const entry of readdirSync(join(dir, rel)).sort()) {
    const relPath = rel ? `${rel}/${entry}` : entry;
    if (statSync(join(dir, relPath)).isDirectory()) found.push(...htmlFiles(dir, relPath));
    else if (entry.endsWith('.html')) found.push(relPath);
  }
  return found;
}

/**
 * Compare two build output directories file by file.
 * @returns {{ files: number, differing: {file: string, diffs: object[]}[], missing: string[], added: string[] }}
 */
export function compareDirs(beforeDir, afterDir, read = (p) => readFileSync(p, 'utf8')) {
  const before = htmlFiles(beforeDir);
  const after = new Set(htmlFiles(afterDir));
  const differing = [];
  const missing = [];
  for (const file of before) {
    if (!after.has(file)) {
      missing.push(file);
      continue;
    }
    after.delete(file);
    const diffs = diffTrees(normaliseHtml(read(join(beforeDir, file))), normaliseHtml(read(join(afterDir, file))));
    if (diffs.length > 0) differing.push({ file, diffs });
  }
  return { files: before.length, differing, missing, added: [...after] };
}

/** A difference is known when file, what, before and after all match an entry of the known list. */
export function isKnown(file, diff, known) {
  return known.some((k) => k.file === file && k.what === diff.what && k.before === diff.before && k.after === diff.after);
}

/**
 * Print a report and return the exit code.
 * --known <file.json>: list of { file, what, before, after, reason } differences that are reported but do not fail
 * (they wait for the owner's approval).
 */
export function compareMain({ argv, out = console.log, compare = compareDirs, readJson = (p) => JSON.parse(readFileSync(p, 'utf8')) }) {
  const [beforeDir, afterDir, ...rest] = argv;
  if (!beforeDir || !afterDir) {
    out('usage: compare-dom.mjs <before-dir> <after-dir> [--known known-diffs.json]');
    return 2;
  }
  const knownIndex = rest.indexOf('--known');
  const known = knownIndex >= 0 ? readJson(rest[knownIndex + 1]) : [];
  const result = compare(beforeDir, afterDir);
  let unexpected = 0;
  let knownCount = 0;
  for (const { file, diffs } of result.differing) {
    out(`DIFF ${file}`);
    for (const d of diffs) {
      const isKnownDiff = isKnown(file, d, known);
      if (isKnownDiff) knownCount++;
      else unexpected++;
      out(`  ${isKnownDiff ? 'KNOWN ' : ''}${d.path} ${d.what}: ${d.before} -> ${d.after}`);
    }
  }
  for (const file of result.missing) out(`MISSING ${file}`);
  for (const file of result.added) out(`ADDED ${file}`);
  out(`compared ${result.files} files: ${unexpected} unexpected differences, ${knownCount} known (awaiting approval), ${result.missing.length} missing, ${result.added.length} added`);
  return unexpected + result.missing.length > 0 ? 1 : 0;
}
