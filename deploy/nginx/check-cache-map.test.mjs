import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkCacheMap, extractImmutableRegex, listFiles } from './check-cache-map.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, 'check-cache-map.mjs');
const rule = extractImmutableRegex(readFileSync(join(HERE, 'henniefrancis-tech.conf'), 'utf8'));

function tree(files) {
  const root = mkdtempSync(join(tmpdir(), 'cachemap-'));
  for (const f of files) {
    mkdirSync(dirname(join(root, f)), { recursive: true });
    writeFileSync(join(root, f), 'x');
  }
  return root;
}

test('the rule is read from the nginx file and accepts build hashes', () => {
  for (const uri of ['/main-ABCD1234.js', '/styles-9Z8Y7X6W.css', '/chunk-a1b2c3d4.js', '/media/inter-latin-AB12CD34.woff2', '/chunk-ab_-9xYz.js']) {
    assert.ok(rule.test(uri), uri);
  }
});

test('the rule rejects names without a hash and public files', () => {
  for (const uri of ['/favicon.ico', '/favicon.png', '/apple-touch-icon.png', '/scripts/theme-init.js', '/main.js', '/a-document.js', '/index.html']) {
    assert.ok(!rule.test(uri), uri);
  }
});

test('extractImmutableRegex fails when the rule is missing or duplicated', () => {
  assert.throws(() => extractImmutableRegex('map $uri $x { default "no-cache"; }'), /found 0/);
  const line = '    "~-[A-Z0-9]{8}\.js$" "public, max-age=31536000, immutable";';
  assert.throws(() => extractImmutableRegex(`${line}\n${line}`), /found 2/);
  assert.ok(extractImmutableRegex(`${line}\r\n`) instanceof RegExp);
});

test('checkCacheMap passes a consistent build', () => {
  const r = checkCacheMap(
    ['main-ABCD1234.js', 'styles-9Z8Y7X6W.css', 'media/f-AB12CD34.woff', 'favicon.ico', 'scripts/theme-init.js', 'index.html'],
    ['favicon.ico', 'scripts/theme-init.js'],
    rule,
  );
  assert.deepEqual(r, { errors: [], hashed: 3, copied: 2 });
});

test('checkCacheMap reports an emitted file the rule misses', () => {
  const r = checkCacheMap(['main-ABCD1234.js', 'chunk.js'], [], rule);
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0], /does not match.*\/chunk\.js/);
});

test('checkCacheMap reports a public file the rule matches', () => {
  const r = checkCacheMap(['main-ABCD1234.js', 'logo-ABCD1234.png'], ['logo-ABCD1234.png'], rule);
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0], /copied from public but matches/);
});

test('checkCacheMap fails on a dist with no emitted files', () => {
  assert.match(checkCacheMap(['index.html'], [], rule).errors[0], /wrong dist folder/);
});

test('listFiles returns sorted relative paths', () => {
  const root = tree(['b.txt', 'a/c.txt']);
  try {
    assert.deepEqual(listFiles(root), ['a/c.txt', 'b.txt']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the command line exits 0, 1 and 2', () => {
  const ok = tree(['main-ABCD1234.js', 'favicon.ico']);
  const pub = tree(['favicon.ico']);
  const bad = tree(['main-ABCD1234.js', 'chunk.js']);
  try {
    assert.equal(spawnSync('node', [SCRIPT, ok, pub]).status, 0);
    assert.equal(spawnSync('node', [SCRIPT, bad, pub]).status, 1);
    assert.equal(spawnSync('node', [SCRIPT]).status, 2);
    assert.equal(spawnSync('node', [SCRIPT, ok, join(ok, 'missing')]).status, 2);
  } finally {
    for (const d of [ok, pub, bad]) rmSync(d, { recursive: true, force: true });
  }
});
