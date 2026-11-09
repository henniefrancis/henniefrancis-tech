import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { S3Client } from '@aws-sdk/client-s3';
import { DOWNLOAD_CONCURRENCY } from './download.mjs';
import { runPlan } from './plan.mjs';
import { bucketFromEnv, uploadOutDir } from './upload.mjs';

// The Angular app folder, relative to the repo root. One place to change if the layout moves.
export const DEFAULT_APP_DIR = 'src/app';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_OUT_DIR = path.join(packageDir, 'out');
const DEFAULT_REPO_ROOT = path.resolve(packageDir, '..', '..');

export const USAGE = `Usage: node migrate.mjs --plan [--local-source <dir> ...] [--app-dir <dir>] [--out <dir>] [--concurrency <1-${DOWNLOAD_CONCURRENCY}>]
       node migrate.mjs --upload [--out <dir>] [--dry-run]

  --plan          Download, process and write out/ and out/manifest.json. No AWS credentials.
  --upload        Upload out/ to the image bucket named by IMAGE_BUCKET (the owner runs this).
  --local-source  Folder checked first for originals, matched by URL path suffix. Repeatable; earlier folders win.
  --app-dir       App folder to scan for images, relative to the repo root (default: ${DEFAULT_APP_DIR}).
  --out           Output folder (default: tools/images/out).
  --dry-run       With --upload: list what would be uploaded, call nothing.
`;

const mb = (bytes) => (bytes / 1024 / 1024).toFixed(2);

function parse(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      plan: { type: 'boolean' },
      upload: { type: 'boolean' },
      'dry-run': { type: 'boolean' },
      'local-source': { type: 'string', multiple: true },
      out: { type: 'string' },
      'app-dir': { type: 'string' },
      'repo-root': { type: 'string' },
      concurrency: { type: 'string' },
      help: { type: 'boolean' },
    },
    strict: true,
  });
  return values;
}

function printSummary(manifest, log) {
  const { summary } = manifest;
  log(
    `found ${summary.found}, processed ${summary.processed} (${summary.uniqueImages} unique), ` +
      `unavailable ${summary.unavailable}, unsupported ${summary.unsupported}, skipped-svg ${summary.skippedSvg}, failed ${summary.failed}`,
  );
  log(`size before ${mb(summary.bytesIn)} MB, after ${mb(summary.bytesOut)} MB (WebP variants)`);
  for (const status of ['unavailable', 'unsupported', 'skipped-svg', 'failed']) {
    for (const item of manifest.images.filter((i) => i.status === status)) {
      log(`${status}: ${item.key} (${item.httpStatus ?? item.reason}) from ${item.sources.join(', ')}`);
    }
  }
  for (const item of manifest.unresolved) log(`unresolved reference "${item.value}" in ${item.file}`);
}

async function plan(values, deps) {
  const repoRoot = path.resolve(values['repo-root'] ?? deps.defaultRepoRoot);
  const concurrency = Number(values.concurrency ?? DOWNLOAD_CONCURRENCY);
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > DOWNLOAD_CONCURRENCY) {
    throw new Error(`--concurrency must be an integer from 1 to ${DOWNLOAD_CONCURRENCY}.`);
  }
  const manifest = await runPlan({
    appDir: path.resolve(repoRoot, values['app-dir'] ?? DEFAULT_APP_DIR),
    repoRoot,
    outDir: path.resolve(values.out ?? deps.defaultOut),
    localSources: (values['local-source'] ?? []).map((dir) => path.resolve(dir)),
    concurrency,
    fetchImpl: deps.fetchImpl,
    sleep: deps.sleep,
    random: deps.random,
    log: deps.log,
  });
  printSummary(manifest, deps.log);
  return manifest.summary.failed > 0 ? 1 : 0;
}

async function upload(values, deps) {
  const bucket = bucketFromEnv(deps.env);
  const outDir = path.resolve(values.out ?? deps.defaultOut);
  const manifest = JSON.parse(await readFile(path.join(outDir, 'manifest.json'), 'utf8'));
  const processed = new Set(manifest.images.filter((i) => i.status === 'processed').map((i) => i.ref.id));
  if (processed.size === 0) throw new Error('The manifest has no processed images. Run --plan first.');
  if (values['dry-run']) {
    deps.log(`dry run: ${processed.size} images would be uploaded; nothing was sent`);
    return 0;
  }
  const totals = await uploadOutDir(deps.makeClient(), bucket, outDir, manifest, deps.log);
  deps.log(`done: ${totals.images} images, ${totals.uploaded} objects uploaded, ${totals.exists} already present`);
  return 0;
}

/** S3 client for the owner's CloudShell run. Region defaults to the bucket's region. */
export function makeS3Client(env = process.env) {
  return new S3Client({ region: env.AWS_REGION ?? 'af-south-1', followRegionRedirects: true, maxAttempts: 5 });
}

/** CLI entry. Returns the process exit code. */
export async function main(argv, overrides = {}) {
  const env = overrides.env ?? process.env;
  const deps = {
    env,
    log: (line) => console.log(line),
    errorLog: (line) => console.error(line),
    makeClient: () => makeS3Client(env),
    defaultOut: DEFAULT_OUT_DIR,
    defaultRepoRoot: DEFAULT_REPO_ROOT,
    ...overrides,
  };
  try {
    const values = parse(argv);
    if (values.help) {
      deps.log(USAGE);
      return 0;
    }
    if (values.plan === values.upload) {
      throw new Error('Choose exactly one of --plan or --upload.');
    }
    return values.plan ? await plan(values, deps) : await upload(values, deps);
  } catch (error) {
    deps.errorLog(`error: ${error?.message ?? error}`);
    deps.errorLog(USAGE);
    return 2;
  }
}
