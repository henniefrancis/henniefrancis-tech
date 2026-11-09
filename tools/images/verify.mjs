#!/usr/bin/env node
// Entry point only; the logic lives in src/verify.mjs (unit tested). Excluded from coverage.
import { verifyMain } from './src/verify.mjs';

process.exitCode = await verifyMain(process.argv.slice(2));
