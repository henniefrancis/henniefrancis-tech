// CLI: node tools/content/compare-dom.mjs <before-dist> <after-dist> [--skip a.html,b.html]
import { compareMain } from './src/compare-dom.mjs';

process.exitCode = compareMain({ argv: process.argv.slice(2) });
