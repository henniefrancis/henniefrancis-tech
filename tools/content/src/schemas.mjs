// Loads the JSON Schemas (draft 2020-12) and compiles one validator per content type.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

export const SCHEMA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'schemas');
export const SCHEMA_ID_BASE = 'https://henniefrancis.tech/schemas/';

let cached;

/** Returns { ajv, get(name) } where name is the schema file stem, for example `page-home`. */
export function getSchemas(dir = SCHEMA_DIR, force = false) {
  if (cached && !force) return cached;
  const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
  addFormats(ajv, ['date']);
  for (const file of readdirSync(dir).sort()) {
    ajv.addSchema(JSON.parse(readFileSync(join(dir, file), 'utf8')));
  }
  cached = {
    ajv,
    get: (name) => ajv.getSchema(`${SCHEMA_ID_BASE}${name}.schema.json`),
  };
  return cached;
}
