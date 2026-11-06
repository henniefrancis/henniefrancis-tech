#!/usr/bin/env node
import { run } from './run.mjs';

const result = await run(process.argv.slice(2), {
  out: (s) => process.stdout.write(s),
  err: (s) => process.stderr.write(s),
  env: process.env,
});
if (result.exitCode !== undefined) process.exit(result.exitCode);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => result.server.close(() => process.exit(0)));
