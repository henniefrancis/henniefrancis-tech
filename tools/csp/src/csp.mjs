import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { parse } from 'parse5';

/**
 * Script policy for prerendered pages. Angular's autoCsp option writes this
 * policy but refuses to run together with prerendering, so this step does the
 * same work on the finished HTML files: it hashes every inline script, turns
 * the external script tags into one hashed loader script (a script loaded by a
 * trusted script is trusted under strict-dynamic), and writes the policy into a
 * meta tag. The https: and 'unsafe-inline' entries are fallbacks that browsers
 * with hash and strict-dynamic support ignore. The other directives
 * (style, img, font, frame and so on) come from the edge response header,
 * which must not carry script-src or default-src.
 */

const JS_MIME = new Set([
  'application/ecmascript',
  'application/javascript',
  'application/x-ecmascript',
  'application/x-javascript',
  'text/ecmascript',
  'text/javascript',
  'text/javascript1.0',
  'text/javascript1.1',
  'text/javascript1.2',
  'text/javascript1.3',
  'text/javascript1.4',
  'text/javascript1.5',
  'text/jscript',
  'text/livescript',
  'text/x-ecmascript',
  'text/x-javascript',
]);

export class CspError extends Error {}

const attr = (node, name) => node.attrs.find((a) => a.name === name)?.value;

/** True when a script of this type runs (as opposed to a data block such as JSON). */
export function isExecutableType(type) {
  if (type === undefined || type.trim() === '') return true;
  const t = type.trim().toLowerCase();
  return t === 'module' || t === 'importmap' || JS_MIME.has(t.split(';', 1)[0].trim());
}

/** CSP hash source of an inline script's exact text (line endings normalised, as browsers do). */
export function hashScript(text) {
  const digest = createHash('sha256').update(text.replace(/\r\n?/g, '\n'), 'utf8').digest('base64');
  return `'sha256-${digest}'`;
}

export function buildPolicy(hashes) {
  const sources = ["'strict-dynamic'", ...hashes, 'https:'];
  if (hashes.length > 0) sources.push("'unsafe-inline'");
  return `script-src ${sources.join(' ')}; object-src 'none'; base-uri 'self'`;
}

const jsonInScript = (value) => JSON.stringify(value ?? null).replaceAll('<', '\\u003c');

/** The loader that adds the external scripts, in order, from a trusted inline script. */
export function buildLoader(scripts) {
  const list = scripts
    .map((s) => {
      const src = encodeURI(s.src).replaceAll("'", "\\'");
      return `['${src}', ${JSON.stringify(s.type ?? '').replaceAll('<', '\\u003c')}, ${s.async}, ${s.defer}, ${jsonInScript(s.integrity)}, ${jsonInScript(s.crossOrigin)}]`;
    })
    .join();
  return `(() => {
  const scripts = [${list}];
  scripts.forEach(function(scriptUrl) {
    const s = document.createElement('script');
    s.src = scriptUrl[0];
    s.type = scriptUrl[1];
    s.async = scriptUrl[2];
    s.defer = scriptUrl[3];
    if (scriptUrl[4]) {
      s.integrity = scriptUrl[4];
    }
    if (scriptUrl[5]) {
      s.crossOrigin = scriptUrl[5];
    }
    document.lastElementChild.appendChild(s);
  });
})();
`;
}

const isBlank = (n) => (n.nodeName === '#text' && n.value.trim() === '') || n.nodeName === '#comment';

/**
 * Parses a page and returns what the policy has to cover: the executable inline
 * scripts (with their exact text), runs of external scripts, the head element,
 * the existing policy meta tags, and every problem that no policy can fix
 * (inline event handlers and javascript: URLs).
 */
function inspect(html) {
  const doc = parse(html, { sourceCodeLocationInfo: true });
  const found = { inline: [], chains: [], head: undefined, charsetMeta: undefined, policies: [], problems: [] };
  const visit = (node) => {
    let chain = [];
    const endChain = () => {
      if (chain.length > 0) found.chains.push(chain);
      chain = [];
    };
    for (const child of node.childNodes ?? []) {
      if (child.nodeName === 'script' && isExecutableType(attr(child, 'type'))) {
        const loc = child.sourceCodeLocation;
        if (!loc?.endTag) throw new CspError('unterminated-script');
        const src = attr(child, 'src');
        if (src === undefined) {
          endChain();
          found.inline.push(html.slice(loc.startTag.endOffset, loc.endTag.startOffset));
        } else {
          chain.push({
            start: loc.startOffset,
            end: loc.endOffset,
            src,
            type: attr(child, 'type'),
            async: attr(child, 'async') !== undefined,
            defer: attr(child, 'defer') !== undefined,
            integrity: attr(child, 'integrity'),
            crossOrigin: attr(child, 'crossorigin') === '' ? 'anonymous' : attr(child, 'crossorigin'),
          });
        }
      } else if (!isBlank(child)) {
        endChain();
      }
      if (child.attrs) checkAttributes(child, found);
      if (child.nodeName === 'head') found.head = child;
      visit(child);
    }
    endChain();
  };
  visit(doc);
  return found;
}

function checkAttributes(node, found) {
  for (const { name, value } of node.attrs) {
    if (/^on/i.test(name)) found.problems.push(`inline-event-handler:${node.nodeName}`);
    if (/^\s*javascript:/i.test(value) && ['href', 'src', 'action', 'formaction'].includes(name)) {
      found.problems.push(`javascript-url:${node.nodeName}`);
    }
  }
  if (node.nodeName === 'meta' && attr(node, 'http-equiv')?.toLowerCase() === 'content-security-policy') {
    found.policies.push(attr(node, 'content') ?? '');
  }
  if (node.nodeName === 'meta' && attr(node, 'charset') !== undefined && !found.charsetMeta) {
    found.charsetMeta = node;
  }
}

/**
 * Adds the policy to one page. Returns the new HTML and the hashes.
 * Throws CspError (rule name only, never page content) when the page cannot be covered.
 */
export function applyPolicy(html) {
  const found = inspect(html);
  if (found.problems.length > 0) throw new CspError([...new Set(found.problems)].join(','));
  if (found.policies.length > 0) throw new CspError('already-has-policy');
  if (!found.head?.sourceCodeLocation?.startTag) throw new CspError('no-head');

  const edits = [];
  const hashes = new Set(found.inline.map(hashScript));
  for (const chain of found.chains) {
    const loader = buildLoader(chain);
    hashes.add(hashScript(loader));
    edits.push({ start: chain[0].start, end: chain[0].end, text: `<script>${loader}</script>` });
    for (const rest of chain.slice(1)) edits.push({ start: rest.start, end: rest.end, text: '' });
  }
  const sorted = [...hashes].sort();
  const meta = `<meta http-equiv="Content-Security-Policy" content="${buildPolicy(sorted)}">`;
  const anchor = found.charsetMeta?.sourceCodeLocation ?? found.head.sourceCodeLocation.startTag;
  edits.push({ start: anchor.endOffset, end: anchor.endOffset, text: meta });

  let out = html;
  for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return { html: out, hashes: sorted };
}

/**
 * Checks one finished page: it has exactly one policy meta tag, every executable
 * inline script is hashed in it, no external script tag is left, and there are no
 * inline event handlers. Returns rule names only.
 */
export function checkPage(html) {
  const found = inspect(html);
  const rules = [...new Set(found.problems)];
  if (found.policies.length !== 1) return [...rules, found.policies.length === 0 ? 'no-policy' : 'several-policies'];
  const policy = found.policies[0];
  const listed = new Set(policy.split(/\s+/));
  if (!found.inline.every((text) => listed.has(hashScript(text)))) rules.push('unhashed-inline-script');
  if (found.chains.length > 0) rules.push('external-script-tag');
  if (!listed.has("'strict-dynamic'") || !policy.includes("object-src 'none'")) rules.push('weak-policy');
  return rules;
}

async function htmlFiles(dir, io) {
  const files = [];
  for (const entry of await io.readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await htmlFiles(path, io)));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(path);
  }
  return files.sort();
}

/** Applies the policy to every page under dist, or only checks them when check is true. */
export async function run(dist, { check = false, io = { readFile, readdir, writeFile } } = {}) {
  const files = await htmlFiles(dist, io);
  if (files.length === 0) throw new CspError('no-html-files');
  const failures = [];
  for (const file of files) {
    const name = relative(dist, file).split('\\').join('/');
    try {
      const html = await io.readFile(file, 'utf8');
      if (check) {
        for (const rule of checkPage(html)) failures.push(`${name}: ${rule}`);
      } else {
        await io.writeFile(file, applyPolicy(html).html);
      }
    } catch (error) {
      if (!(error instanceof CspError)) throw error;
      failures.push(`${name}: ${error.message}`);
    }
  }
  return { pages: files.length, failures };
}

export async function main(argv, { out, err, io }) {
  const check = argv.includes('--check');
  const dirs = argv.filter((a) => a !== '--check');
  if (dirs.length !== 1) {
    err('usage: node tools/csp/cli.mjs [--check] <distDir>\n');
    return 2;
  }
  try {
    const result = await run(dirs[0], { check, io });
    if (result.failures.length > 0) {
      err(`csp: ${result.failures.length} problem(s)\n${result.failures.join('\n')}\n`);
      return 1;
    }
    out(check ? `csp: ${result.pages} pages checked\n` : `csp: policy written to ${result.pages} pages\n`);
    return 0;
  } catch (error) {
    err(`csp: ${error instanceof CspError ? error.message : `failed (${error.code ?? error.name})`}\n`);
    return 1;
  }
}
