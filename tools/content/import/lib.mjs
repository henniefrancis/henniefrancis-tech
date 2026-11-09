// One-off import helpers: read the pre-extraction site checkout and write the YAML content tree.
// This tooling is outside src/ on purpose: it is a migration aid with its own round-trip self-check
// (load, validate, generate, DOM compare), not part of the runtime pipeline.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import vm from 'node:vm';
import { Document, Scalar, isSeq, visit } from 'yaml';
import { parseFragment } from 'parse5';

export const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';

/** Evaluate a plain array literal that follows `marker` in TypeScript source. */
export function extractArray(source, marker, context = {}) {
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`marker not found: ${marker}`);
  const open = source.indexOf('[', start + marker.length - 1);
  let depth = 0;
  let inString = null;
  for (let i = open; i < source.length; i++) {
    const c = source[i];
    if (inString) {
      if (c === '\\') i++;
      else if (c === inString) inString = null;
    } else if (c === "'" || c === '"' || c === '`') {
      inString = c;
    } else if (c === '[') {
      depth++;
    } else if (c === ']') {
      depth--;
      if (depth === 0) return vm.runInNewContext(`(${source.slice(open, i + 1)})`, { ...context });
    }
  }
  throw new Error(`unterminated array after: ${marker}`);
}

/** Text of an HTML node, entity-decoded, whitespace collapsed. */
export function textOf(node) {
  if (node.nodeName === '#text') return node.value;
  if (node.nodeName === 'br') return ' ';
  return (node.childNodes ?? []).map(textOf).join('');
}
export const clean = (text) => text.replace(/\s+/g, ' ').trim();

export const parseHtml = (html) => parseFragment(html);

/** All elements below a node, depth first. */
export function elements(node, out = []) {
  for (const child of node.childNodes ?? []) {
    if (child.tagName) out.push(child);
    elements(child, out);
  }
  return out;
}
export const attr = (node, name) => node.attrs.find((a) => a.name === name)?.value;
export const hasClass = (node, cls) => (attr(node, 'class') ?? '').split(/\s+/).includes(cls);

/** Serialise data as YAML. Arrays named in `blocks` (all strings) become literal blocks, one paragraph per blank-line group. */
export function toYaml(data, { blocks = [], comment } = {}) {
  const doc = new Document(data);
  visit(doc, {
    Pair(_key, pair) {
      if (blocks.includes(pair.key.value) && isSeq(pair.value) && pair.value.items.every((i) => typeof i.value === 'string')) {
        const scalar = new Scalar(pair.value.items.map((i) => i.value).join('\n\n'));
        scalar.type = 'BLOCK_LITERAL';
        pair.value = scalar;
      }
    },
  });
  if (comment) doc.commentBefore = comment;
  return doc.toString({ lineWidth: 0, minContentWidth: 0, indent: 2 });
}

export function writeFile(root, relPath, text) {
  const abs = join(root, relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, text);
}
