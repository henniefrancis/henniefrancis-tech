import { readFileSync } from 'node:fs';
import { extname } from 'node:path';

/**
 * The edge content security policy (no script-src or default-src: they come from the page meta tag). The text is
 * read from the one file Terraform also reads, so the preview, the browser tests and the edge cannot drift.
 */
export const CSP_FILE = new URL('../../../terraform/csp/content-security-policy.txt', import.meta.url);
export const CSP_DIRECTIVES = readFileSync(CSP_FILE, 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line !== '');

/** Headers the CloudFront response headers policy adds in production (no HSTS: the preview is plain http). */
export const EDGE_HEADERS = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'SAMEORIGIN',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=(), browsing-topics=()',
};

export const IMMUTABLE = 'public, max-age=31536000, immutable';
export const HTML_CACHE = 'no-cache, stale-if-error=86400';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

export function mimeFor(file) {
  return MIME[extname(file).toLowerCase()] ?? 'application/octet-stream';
}

/** Angular output hashing: a dash, eight upper-case letters or digits, then the extension. */
const HASHED = /-[A-Z0-9]{8}\.(?:js|css|woff2?|png|jpe?g|webp|svg|gif|ico)$/;

/** Cache-Control rules. `file` is the served file path, `urlPath` the request path. */
export function cacheControlFor(urlPath, file) {
  if (urlPath.startsWith('/img/') || HASHED.test(file)) return IMMUTABLE;
  if (extname(file).toLowerCase() === '.html') return HTML_CACHE;
  return 'no-cache';
}

/** nginx merge_slashes: collapse runs of slashes. */
export function mergeSlashes(path) {
  return path.replace(/\/{2,}/g, '/');
}

/**
 * The 301 rules of nginx v1, in order. Returns the target path (not yet
 * query-suffixed) or null. Expects a decoded path with slashes merged.
 */
export function redirectTarget(path) {
  const legacy = /^\/pages\/(.+)\.html$/.exec(path);
  if (legacy) return `/${legacy[1]}`;
  const trailing = /^\/(.+)\/$/.exec(path);
  if (trailing) return `/${trailing[1]}`;
  const html = /^\/(.+)\.html$/.exec(path);
  if (html && path !== '/404.html' && path !== '/50x.html') return `/${html[1]}`;
  return null;
}

/** Decodes and validates a request path. Returns null when it is malformed or unsafe. */
export function cleanPath(rawPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    return null;
  }
  if (decoded.includes('\0') || decoded.includes('\\')) return null;
  const merged = mergeSlashes(decoded);
  if (merged.split('/').some((seg) => seg === '..' || seg === '.')) return null;
  return merged;
}
