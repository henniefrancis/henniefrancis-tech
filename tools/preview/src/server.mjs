import { createHash, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { realpath } from 'node:fs/promises';
import { findSiteFile, sendFile, sendText, tryFile } from './files.mjs';
import {
  CSP_DIRECTIVES,
  EDGE_HEADERS,
  IMMUTABLE,
  HTML_CACHE,
  cacheControlFor,
  cleanPath,
  redirectTarget,
} from './rules.mjs';

const CSP_REPORT_PATH = '/__csp-report';
const CSP_REPORTS_PATH = '/__csp-reports';
const IMG_PATTERN = /^\/img\/[0-9a-f]{16}\/[0-9]{2,4}\.webp$/;
const MAX_REPORT_BYTES = 16 * 1024;
const MAX_REPORTS = 200;
const PROXY_TIMEOUT_MS = 15_000;

const digest = (value) => createHash('sha256').update(String(value)).digest();

/** True when the X-Origin-Verify header matches the secret (or no secret is configured). */
export function originOk(headerValue, secret) {
  if (!secret) return true;
  return timingSafeEqual(digest(headerValue ?? ''), digest(secret));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_REPORT_BYTES) {
        reject(new Error('too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/**
 * Creates the preview server. deps.fetchImpl and deps.log are injectable for
 * tests. Requests are logged as "METHOD path status origin_ok=0|1" and never
 * include headers or query strings.
 */
export function createPreviewServer(cfg, deps = {}) {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const log = deps.log ?? (() => {});
  const reports = [];
  let rootPromise;
  let imgRootPromise;
  const getRoot = () => (rootPromise ??= realpath(cfg.dir));
  const getImgRoot = () => (imgRootPromise ??= realpath(cfg.imgDir));

  const commonHeaders = () => {
    const h = cfg.edgeHeaders ? { ...EDGE_HEADERS } : {};
    if (cfg.cspEnforce) h['content-security-policy'] = CSP_DIRECTIVES.join('; ');
    if (cfg.cspReportOnly) {
      h['content-security-policy-report-only'] = [...CSP_DIRECTIVES, `report-uri ${CSP_REPORT_PATH}`].join('; ');
    }
    return h;
  };

  async function notFound(req, res, common) {
    const hit = await tryFile(await getRoot(), '/404.html');
    if (hit) return sendFile(req, res, hit, 404, { ...common, 'cache-control': HTML_CACHE });
    return sendText(res, 404, '404 Not Found', common);
  }

  async function image(req, res, path, common) {
    const headers = { ...common, 'cache-control': IMMUTABLE };
    if (cfg.imgDir) {
      const hit = await tryFile(await getImgRoot(), path.slice('/img'.length));
      return hit ? sendFile(req, res, hit, 200, headers) : notFound(req, res, common);
    }
    if (!cfg.imgOrigin || !IMG_PATTERN.test(path)) return notFound(req, res, common);
    let upstream;
    try {
      upstream = await fetchImpl(`${cfg.imgOrigin}${path}`, {
        redirect: 'manual',
        signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
      });
    } catch {
      return sendText(res, 502, 'Bad Gateway', common);
    }
    if (!upstream.ok) return notFound(req, res, common);
    const body = Buffer.from(await upstream.arrayBuffer());
    res.writeHead(200, { ...headers, 'content-type': 'image/webp', 'content-length': body.length });
    return res.end(req.method === 'HEAD' ? undefined : body);
  }

  async function cspEndpoints(req, res, path) {
    if (path === CSP_REPORTS_PATH && req.method === 'GET') {
      const body = JSON.stringify({ count: reports.length, reports });
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      return res.end(body);
    }
    if (path === CSP_REPORT_PATH && req.method === 'POST') {
      try {
        const parsed = JSON.parse(await readBody(req));
        const r = parsed['csp-report'] ?? parsed;
        if (reports.length < MAX_REPORTS) {
          reports.push({
            directive: String(r['violated-directive'] ?? r.effectiveDirective ?? ''),
            blocked: String(r['blocked-uri'] ?? r.blockedURL ?? ''),
            document: String(r['document-uri'] ?? r.documentURL ?? ''),
          });
        }
        res.writeHead(204);
        return res.end();
      } catch {
        return sendText(res, 400, 'Bad Request');
      }
    }
    return false;
  }

  async function handle(req, res) {
    if (req.method !== 'GET' && req.method !== 'HEAD' && !(req.method === 'POST' && cfg.cspReportOnly)) {
      return sendText(res, 405, 'Method Not Allowed', { allow: 'GET, HEAD' });
    }
    const url = new URL(`http://preview.local${req.url}`);
    const path = cleanPath(url.pathname);
    if (path === null) return sendText(res, 400, 'Bad Request');

    if (cfg.cspReportOnly && (await cspEndpoints(req, res, path)) !== false) return undefined;
    if (req.method === 'POST') return sendText(res, 405, 'Method Not Allowed', { allow: 'GET, HEAD' });

    if (cfg.mode === 'v2' && !originOk(req.headers['x-origin-verify'], cfg.originSecret)) {
      return sendText(res, 403, 'Forbidden');
    }

    const common = commonHeaders();
    const target = redirectTarget(path);
    if (target) {
      res.writeHead(301, { ...common, location: encodeURI(target) + url.search, 'cache-control': 'no-cache' });
      return res.end();
    }
    if (path.startsWith('/img/')) return image(req, res, path, common);

    const hit = await findSiteFile(await getRoot(), path);
    if (!hit) return notFound(req, res, common);
    return sendFile(req, res, hit, 200, { ...common, 'cache-control': cacheControlFor(path, hit.file) });
  }

  return createServer((req, res) => {
    const ok = originOk(req.headers['x-origin-verify'], cfg.originSecret);
    res.on('finish', () => log(`${req.method} ${req.url.split('?')[0]} ${res.statusCode} origin_ok=${ok ? 1 : 0}`));
    handle(req, res).catch(() => {
      if (!res.headersSent) sendText(res, 500, 'Internal Server Error');
      else res.destroy();
    });
  });
}
