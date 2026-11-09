#!/usr/bin/env node
// Entry point only; the logic lives in src/cli.mjs (unit tested). Excluded from coverage.
import { main } from './src/cli.mjs';

process.exitCode = await main(process.argv.slice(2));
