import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { profileFor } from './profiles.mjs';


const FULL_URL = /https:\/\/[^\s'"`)<>]+?\.(?:png|jpe?g|webp|gif|svg)(?![\w/])/gi;
const BASE_CONST = /([A-Za-z_$][\w$]*)\s*(?::[^=;,{}\n]+)?=\s*['"`](https:\/\/[^'"`]+\/)['"`]/g;
const CONCAT = /([A-Za-z_$][\w$]*)\s*\+\s*['"]([^'"/][^'"]*\.(?:png|jpe?g|webp|gif|svg))['"]/gi;
const BARE = /\bimage\s*:\s*['"]((?!https?:)[^'"/][^'"]*\.(?:png|jpe?g|webp|gif|svg))['"]/gi;

/** Remove // and block comments from JSON text, leaving strings alone. */
export function stripJsonComments(text) {
  let out = '';
  let i = 0;
  let inString = false;
  while (i < text.length) {
    const c = text[i];
    const next = text[i + 1];
    if (inString) {
      out += c;
      if (c === '\\') {
        out += next ?? '';
        i += 2;
        continue;
      }
      if (c === '"') inString = false;
      i += 1;
    } else if (c === '"') {
      inString = true;
      out += c;
      i += 1;
    } else if (c === '/' && next === '/') {
      while (i < text.length && text[i] !== '\n') i += 1;
    } else if (c === '/' && next === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end === -1 ? text.length : end + 2;
    } else {
      out += c;
      i += 1;
    }
  }
  return out;
}

function joinUrl(base, relative) {
  return new URL(relative.replace(/^\/+/, ''), base).href;
}

/** References found in a parsed JSON document: {url|unresolved, ctx}. */
export function refsFromJson(doc) {
  const base = doc.imageBaseUrl ?? doc.assetBaseUrl ?? null;
  const photoBase = typeof doc.photoBase === 'string' ? doc.photoBase : '';
  const refs = [];
  const visit = (node, ctx) => {
    if (Array.isArray(node)) {
      node.forEach((child) => visit(child, `${ctx}.[]`));
    } else if (node && typeof node === 'object') {
      for (const [key, value] of Object.entries(node)) {
        if (key === 'image' && typeof value === 'string') {
          refs.push(resolveJsonImage(value, base, ctx.includes('.photos') ? photoBase : '', ctx));
        } else {
          visit(value, `${ctx}.${key}`);
        }
      }
    }
  };
  visit(doc, '');
  return refs;
}

function resolveJsonImage(value, base, prefix, ctx) {
  if (/^https:\/\//i.test(value)) return { url: value, ctx };
  if (!base) return { unresolved: value, ctx };
  return { url: joinUrl(base, prefix + value), ctx };
}

/** References found in TypeScript or HTML text. */
export function refsFromText(text) {
  const refs = new Map();
  const bases = new Map();
  for (const m of text.matchAll(BASE_CONST)) bases.set(m[1], m[2]);
  for (const m of text.matchAll(FULL_URL)) refs.set(m[0], { url: m[0], ctx: '' });
  const unresolved = [];
  for (const m of text.matchAll(CONCAT)) {
    const base = bases.get(m[1]);
    if (base) {
      const url = joinUrl(base, m[2]);
      refs.set(url, { url, ctx: '' });
    }
  }
  for (const m of text.matchAll(BARE)) {
    if (bases.size === 1) {
      const url = joinUrl([...bases.values()][0], m[1]);
      refs.set(url, { url, ctx: '' });
    } else {
      unresolved.push({ unresolved: m[1], ctx: '' });
    }
  }
  return [...refs.values(), ...unresolved];
}

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

const isSource = (name) =>
  name.endsWith('.json') || name.endsWith('.html') || (name.endsWith('.ts') && !name.endsWith('.spec.ts'));

/**
 * Collect every image reference under `appDir`.
 * @returns {Promise<{images: Map<string, {url: string, profile: string, sources: string[]}>, unresolved: {file: string, value: string}[]}>}
 */
export async function collectImages(appDir, repoRoot) {
  const images = new Map();
  const unresolved = [];
  for await (const file of walk(appDir)) {
    if (!isSource(path.basename(file))) continue;
    const text = await readFile(file, 'utf8');
    const rel = path.relative(repoRoot, file).split(path.sep).join('/');
    const refs = file.endsWith('.json') ? refsFromJson(JSON.parse(stripJsonComments(text))) : refsFromText(text);
    for (const ref of refs) {
      if (ref.unresolved !== undefined) {
        unresolved.push({ file: rel, value: ref.unresolved });
        continue;
      }
      let entry = images.get(ref.url);
      if (!entry) {
        entry = { url: ref.url, profile: profileFor(new URL(ref.url).pathname, ref.ctx), sources: [] };
        images.set(ref.url, entry);
      }
      if (!entry.sources.includes(rel)) entry.sources.push(rel);
    }
  }
  return { images, unresolved };
}

/**
 * Candidate relative paths for a local-source lookup: the URL path suffixes,
 * longest first (a/b/c.png, b/c.png, c.png). The URL parser already collapses dot segments; drive letters, backslashes and NULs are refused.
 */
export function localCandidates(url) {
  const segments = new URL(url).pathname.split('/').filter(Boolean).map(decodeURIComponent);
  if (segments.some((s) => s.includes(':') || s.includes('\\') || s.includes('\0'))) return [];
  const candidates = [];
  for (let start = 0; start < segments.length; start += 1) candidates.push(segments.slice(start).join('/'));
  return candidates;
}

/** Find an original under `localDir`, or null. */
export async function findLocal(localDir, url) {
  const root = path.resolve(localDir);
  for (const candidate of localCandidates(url)) {
    const full = path.resolve(root, candidate);
    try {
      return await readFile(full);
    } catch {
      // not there, try the next shorter suffix
    }
  }
  return null;
}
