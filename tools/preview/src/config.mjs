import { parseArgs } from 'node:util';

/** Ports used by other tools on the owner's machine. */
export const RESERVED_PORTS = new Set([4200, 4210]);
export const DEFAULT_PORT = 4280;

export class ConfigError extends Error {}

export const HELP = `hft-preview: local preview that mirrors the production nginx rules.

Usage: node src/cli.mjs --dir <build output> [options]

  --dir <path>          directory to serve (required), for example the Angular browser output
  --port <n>            port (default ${DEFAULT_PORT}; 4200 and 4210 are refused)
  --host <addr>         bind address (default 0.0.0.0, so phones on the Wi-Fi can connect)
  --mode <v1|v2>        v1: origin header check is log-only; v2: 403 without the header
  --csp-report-only     send the Content-Security-Policy-Report-Only header and collect reports
  --csp-enforce         send the enforced Content-Security-Policy header (the policy the edge carries, without upgrade-insecure-requests on plain http)
  --edge-headers        also send the CloudFront response-header-policy headers
  --img-dir <path>      serve /img/* from this directory (layout: <id>/<width>.webp)
  --img-origin <url>    proxy /img/* to this https origin (for example the live site)
  -h, --help            show this help

Environment: PREVIEW_PORT sets the default port; PREVIEW_ORIGIN_SECRET is the
value of the X-Origin-Verify header (read from the environment only, never logged).
`;

const OPTIONS = {
  dir: { type: 'string' },
  port: { type: 'string' },
  host: { type: 'string' },
  mode: { type: 'string' },
  'csp-report-only': { type: 'boolean' },
  'csp-enforce': { type: 'boolean' },
  'edge-headers': { type: 'boolean' },
  'img-dir': { type: 'string' },
  'img-origin': { type: 'string' },
  help: { type: 'boolean', short: 'h' },
};

function toPort(raw) {
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new ConfigError(`invalid port "${raw}"`);
  }
  if (RESERVED_PORTS.has(port)) {
    throw new ConfigError(`port ${port} is reserved for other tools`);
  }
  return port;
}

function toImgOrigin(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new ConfigError('--img-origin must be a valid URL');
  }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new ConfigError('--img-origin must be an https URL without credentials');
  }
  return url.origin;
}

/** Parses argv and env into a validated config. Throws ConfigError. */
export function parseConfig(argv, env = {}) {
  let values;
  try {
    ({ values } = parseArgs({ args: argv, options: OPTIONS, strict: true, allowPositionals: false }));
  } catch (err) {
    throw new ConfigError(err.message);
  }
  if (values.help) return { help: true };
  if (!values.dir) throw new ConfigError('--dir is required');
  const mode = values.mode ?? 'v1';
  if (mode !== 'v1' && mode !== 'v2') throw new ConfigError('--mode must be v1 or v2');
  if (values['img-dir'] && values['img-origin']) {
    throw new ConfigError('use either --img-dir or --img-origin, not both');
  }
  const originSecret = env.PREVIEW_ORIGIN_SECRET || '';
  if (mode === 'v2' && !originSecret) {
    throw new ConfigError('--mode v2 needs PREVIEW_ORIGIN_SECRET in the environment');
  }
  return {
    help: false,
    dir: values.dir,
    port: toPort(values.port ?? env.PREVIEW_PORT ?? DEFAULT_PORT),
    host: values.host ?? '0.0.0.0',
    mode,
    cspReportOnly: Boolean(values['csp-report-only']),
    cspEnforce: Boolean(values['csp-enforce']),
    edgeHeaders: Boolean(values['edge-headers']),
    imgDir: values['img-dir'],
    imgOrigin: values['img-origin'] ? toImgOrigin(values['img-origin']) : undefined,
    originSecret,
  };
}
