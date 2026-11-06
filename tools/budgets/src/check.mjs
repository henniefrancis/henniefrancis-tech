import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, relative, sep } from 'node:path';

/** Interface I-5: no image over 250 kB (decimal), no amazonaws.com, no third-party CDN hosts. */
export const MAX_IMAGE_BYTES = 250_000;
export const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.ico']);
export const TEXT_EXTENSIONS = new Set([
  '.html', '.js', '.mjs', '.css', '.json', '.xml', '.txt', '.svg', '.map', '.webmanifest',
]);
export const FORBIDDEN_HOSTS = [
  'amazonaws.com',
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com',
  'unpkg.com',
  'code.jquery.com',
  'cdn.tailwindcss.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'stackpath.bootstrapcdn.com',
  'maxcdn.bootstrapcdn.com',
];

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

/**
 * Scans a build output directory. Returns violations as
 * { file, rule, detail }; file paths are relative to dist and use "/".
 * Matched file content is never echoed, only the rule and host name.
 */
export async function checkDist(dist) {
  const violations = [];
  let files = 0;
  for await (const file of walk(dist)) {
    files++;
    const rel = relative(dist, file).split(sep).join('/');
    const ext = extname(file).toLowerCase();
    if (IMAGE_EXTENSIONS.has(ext)) {
      const { size } = await stat(file);
      if (size > MAX_IMAGE_BYTES) {
        violations.push({ file: rel, rule: 'image-size', detail: `${size} bytes exceeds ${MAX_IMAGE_BYTES}` });
      }
    } else if (TEXT_EXTENSIONS.has(ext)) {
      const text = (await readFile(file, 'utf8')).toLowerCase();
      for (const host of FORBIDDEN_HOSTS) {
        if (text.includes(host)) {
          violations.push({ file: rel, rule: host === 'amazonaws.com' ? 'amazonaws' : 'cdn-host', detail: host });
        }
      }
    }
  }
  return { files, violations };
}

/** CLI body: returns the exit code. io = { out, err }. */
export async function main(argv, io) {
  const dist = argv[0];
  if (!dist || argv.length !== 1) {
    io.err('usage: node tools/budgets/check-dist.mjs <distDir>\n');
    return 2;
  }
  let result;
  try {
    result = await checkDist(dist);
  } catch (err) {
    io.err(`error: cannot scan "${dist}" (${err.code})\n`);
    return 2;
  }
  for (const v of result.violations) io.err(`FAIL ${v.rule}: ${v.file} (${v.detail})\n`);
  io.out(`checked ${result.files} files, ${result.violations.length} violations\n`);
  return result.violations.length === 0 ? 0 : 1;
}
