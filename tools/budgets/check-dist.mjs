#!/usr/bin/env node
// Usage: node tools/budgets/check-dist.mjs <distDir>
import { main } from './src/check.mjs';

process.exitCode = await main(process.argv.slice(2), {
  out: (s) => process.stdout.write(s),
  err: (s) => process.stderr.write(s),
});
