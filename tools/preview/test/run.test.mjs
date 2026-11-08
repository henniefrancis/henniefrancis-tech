import { createServer } from 'node:net';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { lanAddresses, run } from '../src/run.mjs';

const root = mkdtempSync(join(tmpdir(), 'hft-preview-run-'));
const site = join(root, 'site');
mkdirSync(site);
writeFileSync(join(site, 'index.html'), 'ok');
const notDir = join(root, 'file.txt');
writeFileSync(notDir, 'x');
const opened = [];

afterAll(async () => {
  await Promise.all(opened.map((s) => new Promise((r) => s.close(r))));
  rmSync(root, { recursive: true, force: true });
});

const makeIo = (env = {}) => {
  const out = [];
  const err = [];
  return { io: { out: (s) => out.push(s), err: (s) => err.push(s), env }, out, err };
};

async function freePort() {
  return new Promise((resolve) => {
    const s = createServer();
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

describe('lanAddresses', () => {
  it('lists external IPv4 addresses only', () => {
    expect(
      lanAddresses({
        lo: [{ family: 'IPv4', internal: true, address: '127.0.0.1' }],
        wifi: [
          { family: 'IPv6', internal: false, address: 'fe80::1' },
          { family: 'IPv4', internal: false, address: '192.0.2.10' },
        ],
        gone: undefined,
      }),
    ).toEqual(['192.0.2.10']);
  });
  it('works against the real interfaces', () => {
    expect(Array.isArray(lanAddresses())).toBe(true);
  });
});

describe('run', () => {
  it('prints help', async () => {
    const { io, out } = makeIo();
    expect(await run(['--help'], io)).toEqual({ exitCode: 0 });
    expect(out.join('')).toContain('Usage');
  });

  it('reports configuration errors with exit code 2', async () => {
    const a = makeIo();
    expect(await run([], a.io)).toEqual({ exitCode: 2 });
    expect(a.err.join('')).toContain('--dir is required');
    const b = makeIo();
    expect(await run(['--dir', join(root, 'missing')], b.io)).toEqual({ exitCode: 2 });
    expect(b.err.join('')).toContain('does not exist');
    const c = makeIo();
    expect(await run(['--dir', notDir], c.io)).toEqual({ exitCode: 2 });
    expect(c.err.join('')).toContain('not a directory');
    const d = makeIo();
    expect(await run(['--dir', site, '--img-dir', join(root, 'missing')], d.io)).toEqual({ exitCode: 2 });
    expect(d.err.join('')).toContain('--img-dir');
  });

  it('rethrows unexpected errors', async () => {
    const env = new Proxy({}, { get() { throw new TypeError('unexpected'); } });
    await expect(run(['--dir', site], { out() {}, err() {}, env })).rejects.toThrow('unexpected');
  });

  it('starts, serves and prints the local URL (and network URLs on 0.0.0.0)', async () => {
    const port = await freePort();
    const { io, out } = makeIo();
    const result = await run(['--dir', site, '--port', String(port), '--img-dir', site], io);
    opened.push(result.server);
    expect(result.config.port).toBe(port);
    expect(out.join('')).toContain(`http://127.0.0.1:${port}/`);
    expect((await fetch(`http://127.0.0.1:${port}/`)).status).toBe(200);
    await vi.waitFor(() => expect(out.join('')).toContain('GET / 200 origin_ok=1'));
  });

  it('prints only the local URL on a loopback bind', async () => {
    const port = await freePort();
    const { io, out } = makeIo();
    const result = await run(['--dir', site, '--port', String(port), '--host', '127.0.0.1'], io);
    opened.push(result.server);
    expect(out.join('')).not.toContain('network:');
  });

  it('exits 1 when the port is taken', async () => {
    const port = await freePort();
    const blocker = createServer();
    await new Promise((r) => blocker.listen(port, '127.0.0.1', r));
    const { io, err } = makeIo();
    expect(await run(['--dir', site, '--port', String(port), '--host', '127.0.0.1'], io)).toEqual({ exitCode: 1 });
    expect(err.join('')).toContain('cannot listen');
    await new Promise((r) => blocker.close(r));
  });
});
