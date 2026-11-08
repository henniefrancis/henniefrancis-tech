#!/usr/bin/env node
// Post-build step: node tools/csp/cli.mjs [--check] <distDir>
import { main } from './src/csp.mjs';

process.exitCode = await main(process.argv.slice(2), {
  out: (s) => process.stdout.write(s),
  err: (s) => process.stderr.write(s),
});
