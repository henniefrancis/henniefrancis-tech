import { describe, expect, it } from 'vitest';
import { PAGE_KEYS, PAGE_ROUTES, recordKey, routeList } from '../src/routes.mjs';
import { SCHEMA_DIR, getSchemas, personalDataFields } from '../src/schemas.mjs';

describe('routes', () => {
  it('has 13 routed pages plus the not-found page file', () => {
    expect(Object.keys(PAGE_ROUTES)).toHaveLength(13);
    expect(PAGE_KEYS).toHaveLength(14);
    expect(PAGE_KEYS.at(-1)).toBe('not-found');
  });
  it('extracts a record key', () => {
    expect(recordKey('speaking/events/a/2024.yaml', 'speaking/events')).toBe('a/2024');
  });
  it('lists static, event, gallery and certificate routes, sorted', () => {
    const list = routeList({
      'speaking/events/aws-summit/2024.yaml': {},
      'speaking/galleries/aws-summit/2024.yaml': {},
      'certifications/details/mcts/ABCDEFGH-1.yaml': {},
      'certifications/items/x.yaml': {},
    });
    expect(list).toContain('/');
    expect(list).toContain('/public-speaking/aws-summit/2024');
    expect(list).toContain('/public-speaking/aws-summit/photos/2024');
    expect(list).toContain('/certifications/microsoft/mcts/ABCDEFGH-1');
    expect(list).toEqual([...list].sort());
    expect(list).toHaveLength(16);
  });
});

describe('getSchemas', () => {
  it('compiles every schema and caches the result', () => {
    const first = getSchemas();
    expect(getSchemas()).toBe(first);
    expect(first.get('page-home')).toBeTypeOf('function');
    expect(first.get('cert-item')({})).toBe(false);
  });
  it('can be rebuilt on demand', () => {
    expect(getSchemas(SCHEMA_DIR, true).get('site')).toBeTypeOf('function');
  });
});

describe('personalDataFields', () => {
  it('lists every field marked as personal data, so they can be removed in one place', () => {
    const found = personalDataFields();
    expect(Object.keys(found).sort()).toEqual(['page-career-history', 'page-cv']);
    expect(found['page-cv']).toHaveLength(3);
    expect(found['page-cv'].every((p) => p.includes('contact'))).toBe(true);
    expect(found['page-career-history']).toHaveLength(3);
    expect(found['page-career-history'].every((p) => p.includes('referee'))).toBe(true);
  });
});
