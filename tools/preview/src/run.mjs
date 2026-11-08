import { stat } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { ConfigError, HELP, parseConfig } from './config.mjs';
import { createPreviewServer } from './server.mjs';

/** Non-internal IPv4 addresses, so the URL can be typed on a phone. */
export function lanAddresses(interfaces = networkInterfaces()) {
  return Object.values(interfaces)
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
}

async function assertDir(path, label) {
  let info;
  try {
    info = await stat(path);
  } catch {
    throw new ConfigError(`${label} "${path}" does not exist`);
  }
  if (!info.isDirectory()) throw new ConfigError(`${label} "${path}" is not a directory`);
}

/**
 * Starts the preview server. Returns { server, config } once listening, or
 * { exitCode } for help and configuration errors. io = { out, err, env }.
 */
export async function run(argv, io) {
  let config;
  try {
    config = parseConfig(argv, io.env);
    if (config.help) {
      io.out(HELP);
      return { exitCode: 0 };
    }
    await assertDir(config.dir, '--dir');
    if (config.imgDir) await assertDir(config.imgDir, '--img-dir');
  } catch (err) {
    if (!(err instanceof ConfigError)) throw err;
    io.err(`error: ${err.message}\n`);
    return { exitCode: 2 };
  }
  const server = createPreviewServer(config, { log: (line) => io.out(`${line}\n`) });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(config.port, config.host, resolve);
  }).catch((err) => {
    io.err(`error: cannot listen on ${config.host}:${config.port} (${err.code})\n`);
    config = undefined;
  });
  if (!config) return { exitCode: 1 };
  const { port } = server.address();
  io.out(`preview (${config.mode}) serving ${config.dir}\n`);
  io.out(`  local:   http://127.0.0.1:${port}/\n`);
  if (config.host === '0.0.0.0') {
    for (const ip of lanAddresses()) io.out(`  network: http://${ip}:${port}/\n`);
  }
  return { server, config };
}
