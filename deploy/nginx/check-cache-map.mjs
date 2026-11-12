#!/usr/bin/env node
// Checks the immutable-cache rule in henniefrancis-tech.conf against a real
// production build, so the rule cannot drift from what the bundler emits.
//
//   node deploy/nginx/check-cache-map.mjs <dist> <public>
//
// The regular expression is read from the nginx file itself (the single
// source). The check fails when:
//   - a file the bundler emitted (.js, .css, .woff, .woff2; not copied from
//     <public>, not under scripts/) does not match, because it would be
//     served without the long cache lifetime; or
//   - a file copied from <public> matches, because it has no content hash in
//     its name and must be revalidated.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const CONF = join(dirname(fileURLToPath(import.meta.url)), 'henniefrancis-tech.conf');
const HASHED_EXTENSIONS = /\.(?:js|css|woff2?)$/;
const IMMUTABLE_VALUE = 'public, max-age=31536000, immutable';

/** Reads the immutable-cache regular expression out of the nginx file text. */
export function extractImmutableRegex(confText) {
  const matches = [];
  for (const line of confText.split(/\r?\n/)) {
    const m = /^\s*"~(.+)"\s+"([^"]+)";\s*$/.exec(line);
    if (m && m[2] === IMMUTABLE_VALUE) matches.push(m[1]);
  }
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one immutable cache rule in the nginx file, found ${matches.length}.`);
  }
  // nginx (PCRE) and JavaScript agree on this syntax: groups, lookahead, classes.
  return new RegExp(matches[0]);
}

/** All files below a folder, as forward-slash paths relative to it. */
export function listFiles(root) {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else out.push(relative(root, full).split(sep).join('/'));
    }
  };
  walk(root);
  return out.sort();
}

/**
 * @param {string[]} distFiles   relative paths in the build output
 * @param {string[]} publicFiles relative paths in the public folder
 * @param {RegExp} rule
 * @returns {{ errors: string[], hashed: number, copied: number }}
 */
export function checkCacheMap(distFiles, publicFiles, rule) {
  const fromPublic = new Set(publicFiles);
  const errors = [];
  let hashed = 0;
  let copied = 0;
  for (const f of distFiles) {
    const uri = `/${f}`;
    if (fromPublic.has(f)) {
      copied += 1;
      if (rule.test(uri)) errors.push(`copied from public but matches the immutable rule: ${uri}`);
    } else if (!f.startsWith('scripts/') && HASHED_EXTENSIONS.test(f)) {
      hashed += 1;
      if (!rule.test(uri)) errors.push(`emitted by the bundler but does not match the immutable rule: ${uri}`);
    }
  }
  if (hashed === 0) errors.push('no bundler-emitted files were found: wrong dist folder?');
  return { errors, hashed, copied };
}

function main(argv) {
  const [dist, pub] = argv;
  if (!dist || !pub) {
    console.error('usage: check-cache-map.mjs <dist> <public>');
    return 2;
  }
  for (const d of [dist, pub]) {
    if (!existsSync(d) || !statSync(d).isDirectory()) {
      console.error(`Not a folder: ${d}`);
      return 2;
    }
  }
  const rule = extractImmutableRegex(readFileSync(CONF, 'utf8'));
  const { errors, hashed, copied } = checkCacheMap(listFiles(dist), listFiles(pub), rule);
  if (errors.length > 0) {
    for (const e of errors) console.error(`::error::${e}`);
    return 1;
  }
  console.log(`cache map ok: ${hashed} hashed files match, ${copied} public files do not`);
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = main(process.argv.slice(2));
}
