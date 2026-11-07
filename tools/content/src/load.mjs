// YAML loader for the content tree.
// Settings follow the content contract: YAML 1.2 core schema, unique keys, no anchors or aliases,
// no custom tags, no pretty errors (they quote source text), size caps, NFC normalisation, and the
// paragraph convention for block scalars.
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { isScalar, parseDocument, visit } from 'yaml';

export const MAX_FILE_BYTES = 256 * 1024;
export const MAX_TREE_BYTES = 8 * 1024 * 1024;
export const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif']);

export const YAML_OPTIONS = Object.freeze({
  version: '1.2',
  schema: 'core',
  uniqueKeys: true,
  strict: true,
  maxAliasCount: 0,
  prettyErrors: false,
});

/** Split a block scalar into paragraphs: blank lines separate, single line breaks join with one space. */
export function toParagraphs(text) {
  return text
    .split(/\n[ \t]*\n/)
    .map((block) =>
      block
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line !== '')
        .join(' '),
    )
    .filter((block) => block !== '');
}

/** NFC-normalise every string value in a parsed document (keys are plain ASCII by schema). */
export function normalise(value) {
  if (typeof value === 'string') return value.normalize('NFC');
  if (Array.isArray(value)) return value.map(normalise);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalise(v)]));
  }
  return value;
}

/**
 * Parse one YAML text. Returns { data, errors }. Errors carry a rule code only, never source text.
 * Block scalars (| and >) become string[] of paragraphs.
 */
export function parseYaml(text) {
  const doc = parseDocument(text.replace(/\r\n?/g, '\n'), YAML_OPTIONS);
  if (doc.errors.length > 0) {
    return { data: undefined, errors: doc.errors.map((e) => `yaml-${String(e.code).toLowerCase()}`) };
  }
  visit(doc, {
    Scalar(_key, node) {
      if (isScalar(node) && (node.type === 'BLOCK_LITERAL' || node.type === 'BLOCK_FOLDED')) {
        node.value = toParagraphs(String(node.value));
      }
    },
  });
  return { data: normalise(doc.toJS()), errors: [] };
}

/**
 * Read `<root>/content` into { files, images, archive, hash, errors }.
 * files: relative path (posix, below content/) to parsed data. images: relative paths of image files.
 * hash: sha256 (hex) over every file below content/ (relative path and bytes, in sorted order); the rebuild key.
 * archive: relative paths (posix, below the repo root) of files under archive/, listed only (never read).
 * errors: { file, pointer, rule } with no values.
 */
export function loadTree(root, fs = { lstatSync, readFileSync, readdirSync }) {
  const base = join(root, 'content');
  const files = {};
  const images = [];
  const errors = [];
  let total = 0;
  const digest = createHash('sha256');

  const archive = [];
  const listArchive = (dir, rel) => {
    for (const entry of fs.readdirSync(dir).sort()) {
      const abs = join(dir, entry);
      const relPath = `${rel}/${entry}`;
      if (fs.lstatSync(abs).isDirectory()) listArchive(abs, relPath);
      else archive.push(relPath);
    }
  };

  const walk = (dir, rel) => {
    for (const entry of fs.readdirSync(dir).sort()) {
      const abs = join(dir, entry);
      const relPath = rel ? `${rel}/${entry}` : entry;
      const stat = fs.lstatSync(abs);
      if (stat.isSymbolicLink()) {
        errors.push({ file: relPath, pointer: '', rule: 'symlink-not-allowed' });
      } else if (stat.isDirectory()) {
        walk(abs, relPath);
      } else {
        const bytes = stat.size > MAX_FILE_BYTES && !relPath.startsWith('images/') ? undefined : fs.readFileSync(abs);
        if (bytes) digest.update(`${relPath}\0`).update(bytes).update("\0");
        const ext = entry.includes('.') ? entry.slice(entry.lastIndexOf('.')).toLowerCase() : '';
        if (ext === '.yaml') {
          total += stat.size;
          if (stat.size > MAX_FILE_BYTES) {
            errors.push({ file: relPath, pointer: '', rule: 'file-too-large' });
            continue;
          }
          const { data, errors: yamlErrors } = parseYaml(bytes.toString('utf8'));
          if (yamlErrors.length > 0) {
            for (const rule of yamlErrors) errors.push({ file: relPath, pointer: '', rule });
          } else {
            files[relPath] = data;
          }
        } else if (IMAGE_EXTENSIONS.has(ext) && relPath.startsWith('images/')) {
          images.push(relPath);
        } else {
          errors.push({ file: relPath, pointer: '', rule: 'unexpected-file-type' });
        }
      }
    }
  };

  let present = true;
  try {
    present = fs.lstatSync(base).isDirectory();
  } catch {
    present = false;
  }
  if (!present) {
    return { files, images, archive, hash: '', errors: [{ file: 'content', pointer: '', rule: 'content-folder-missing' }] };
  }
  walk(base, '');
  try {
    listArchive(join(root, 'archive'), 'archive');
  } catch {
    // no archive folder yet: nothing to list
  }
  if (total > MAX_TREE_BYTES) errors.push({ file: 'content', pointer: '', rule: 'tree-too-large' });
  return { files, images, archive, hash: digest.digest('hex'), errors };
}
