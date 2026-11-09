#!/usr/bin/env node
// Post-build SEO step: node tools/seo/cli.mjs <distDir>
import { main } from './src/seo.mjs';

process.exitCode = await main(process.argv.slice(2), {
  out: (s) => process.stdout.write(s),
  err: (s) => process.stderr.write(s),
});
