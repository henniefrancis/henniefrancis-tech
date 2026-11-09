// Count tokens: two allowlisted tokens that the generator replaces with decimal integers.
export const TOKEN_VENDORS = Object.freeze({
  'aws-certifications': 'aws',
  'microsoft-certifications': 'microsoft',
});

const COUNTED_STATUSES = new Set(['active', 'expired', 'retired']);
const TOKEN_PATTERN = /\$\{([^}]*)\}/g;

/**
 * Computed counts per vendor. A certification counts when its kind is `certification` and its status is
 * active, expired or retired. Distinct count keys count once (`countAs`, default the item slug), so renewals
 * of one credential count once. Extra and partner badges, in-progress and to-do items never count.
 * @param {Record<string, any>} items slug to item data
 */
export function countCertifications(items) {
  const keys = { aws: new Set(), microsoft: new Set() };
  for (const [slug, item] of Object.entries(items)) {
    if (item.kind === 'certification' && COUNTED_STATUSES.has(item.status) && item.vendor in keys) {
      keys[item.vendor].add(item.countAs ?? slug);
    }
  }
  return { aws: keys.aws.size, microsoft: keys.microsoft.size };
}

/** True when the text holds a `${` that is not one of the allowlisted tokens. */
export function hasBadToken(text) {
  const rest = text.replace(TOKEN_PATTERN, (whole, name) => (name in TOKEN_VENDORS ? '' : whole));
  return rest.includes('${');
}

/** Replace the allowlisted tokens with their decimal counts. */
export function resolveTokens(text, counts) {
  return text.replace(TOKEN_PATTERN, (whole, name) => (name in TOKEN_VENDORS ? String(counts[TOKEN_VENDORS[name]]) : whole));
}

/** Visit every string in a value with its JSON pointer. */
export function walkStrings(value, visit, pointer = '') {
  if (typeof value === 'string') {
    visit(value, pointer);
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => walkStrings(item, visit, `${pointer}/${index}`));
  } else if (value !== null && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) walkStrings(item, visit, `${pointer}/${key}`);
  }
}

/** Return a copy of the value with every string token-resolved. */
export function resolveDeep(value, counts) {
  if (typeof value === 'string') return resolveTokens(value, counts);
  if (Array.isArray(value)) return value.map((item) => resolveDeep(item, counts));
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveDeep(v, counts)]));
  }
  return value;
}
