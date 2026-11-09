// CLI: node tools/content/validate.mjs [path-to-config-root]
// Validates the content tree and prints file, pointer and rule for every error (never values).
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateMain } from './src/validate-cli.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
process.exitCode = validateMain({ root, env: process.env, argv: process.argv.slice(2) });
