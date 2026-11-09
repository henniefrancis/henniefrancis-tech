import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTree } from '../src/load.mjs';

export const FIXTURE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'tree');

/** A deep copy of the loaded fixture tree, safe to mutate in a test. */
export function fixtureTree() {
  return structuredClone(loadTree(FIXTURE_ROOT));
}

export const rules = (errors) => errors.map((e) => `${e.file} ${e.pointer} ${e.rule}`);
