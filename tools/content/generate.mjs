// CLI: node tools/content/generate.mjs
// Reads the content config (CONTENT_SRC, default <repo>/content-src), validates it, and writes the typed
// modules to src/app/content/generated/. Exit code 1 on any error (fails closed).
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { main } from './src/generate.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
process.exitCode = main({ root, env: process.env, argv: process.argv.slice(2) });
