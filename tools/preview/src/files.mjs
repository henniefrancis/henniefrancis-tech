import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { join, sep } from 'node:path';
import { pipeline } from 'node:stream';
import { mimeFor } from './rules.mjs';

/** Resolves one relative path under root. Symlinks that leave the root are refused. */
export async function tryFile(root, rel) {
  let real;
  try {
    real = await realpath(join(root, rel));
  } catch {
    return null;
  }
  if (real !== root && !real.startsWith(root + sep)) return null;
  const info = await stat(real);
  return info.isFile() ? { file: real, info } : null;
}

/** nginx: try_files $uri $uri/index.html $uri.html =404 (no directory redirect). */
export async function findSiteFile(root, urlPath) {
  for (const rel of [urlPath, `${urlPath}/index.html`, `${urlPath}.html`]) {
    const hit = await tryFile(root, rel);
    if (hit) return hit;
  }
  return null;
}

function etagOf(info) {
  return `W/"${info.size.toString(16)}-${Math.floor(info.mtimeMs).toString(16)}"`;
}

/** Sends a file with ETag, Last-Modified and conditional GET (304). */
export function sendFile(req, res, hit, status, extraHeaders) {
  const etag = etagOf(hit.info);
  const headers = {
    'content-type': mimeFor(hit.file),
    etag,
    'last-modified': hit.info.mtime.toUTCString(),
    ...extraHeaders,
  };
  const inm = req.headers['if-none-match'];
  if (status === 200 && inm && inm.split(',').some((t) => t.trim().replace(/^W\//, '') === etag.replace(/^W\//, ''))) {
    res.writeHead(304, headers);
    res.end();
    return;
  }
  res.writeHead(status, { ...headers, 'content-length': hit.info.size });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  pipeline(createReadStream(hit.file), res, () => {});
}

export function sendText(res, status, text, extraHeaders = {}) {
  res.writeHead(status, {
    'content-type': 'text/plain; charset=utf-8',
    'content-length': Buffer.byteLength(text),
    ...extraHeaders,
  });
  res.end(text);
}
