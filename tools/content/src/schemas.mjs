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
  // Annotation only: marks fields that hold personal data, so they can be found (and removed) in one place.
  ajv.addKeyword({ keyword: 'x-personal-data', schemaType: 'boolean' });
  for (const file of readdirSync(dir).sort()) {
    ajv.addSchema(JSON.parse(readFileSync(join(dir, file), 'utf8')));
  }
  cached = {
    ajv,
    get: (name) => ajv.getSchema(`${SCHEMA_ID_BASE}${name}.schema.json`),
  };
  return cached;
}

/** JSON pointers (schema side) of every property marked as personal data, per schema name. */
export function personalDataFields(dir = SCHEMA_DIR) {
  const found = {};
  const walk = (node, pointer, name) => {
    if (Array.isArray(node)) node.forEach((n, i) => walk(n, `${pointer}/${i}`, name));
    else if (node !== null && typeof node === 'object') {
      if (node['x-personal-data'] === true) (found[name] ??= []).push(pointer);
      for (const [k, v] of Object.entries(node)) walk(v, `${pointer}/${k}`, name);
    }
  };
  for (const file of readdirSync(dir).sort()) walk(JSON.parse(readFileSync(join(dir, file), 'utf8')), '', file.replace('.schema.json', ''));
  return found;
}
