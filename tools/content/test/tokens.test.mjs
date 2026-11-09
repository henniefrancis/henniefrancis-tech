import { describe, expect, it } from 'vitest';
import { TOKEN_VENDORS, countCertifications, hasBadToken, resolveDeep, resolveTokens, walkStrings } from '../src/tokens.mjs';

const item = (vendor, kind, status, extra = {}) => ({ vendor, kind, status, ...extra });

describe('countCertifications', () => {
  it('counts earned certifications per vendor and nothing else', () => {
    const counts = countCertifications({
      a: item('aws', 'certification', 'active'),
      b: item('aws', 'certification', 'expired'),
      c: item('aws', 'certification', 'retired'),
      d: item('aws', 'certification', 'inprogress'),
      e: item('aws', 'certification', 'todo'),
      f: item('aws', 'extra-badge', 'active'),
      g: item('aws', 'partner-badge', 'active'),
      h: item('microsoft', 'certification', 'active'),
      i: item('mongodb', 'certification', 'active'),
    });
    expect(counts).toEqual({ aws: 3, microsoft: 1 });
  });
  it('counts renewals that share a countAs key once, and defaults the key to the slug', () => {
    const counts = countCertifications({
      y22: item('microsoft', 'certification', 'active', { countAs: 'mct' }),
      y23: item('microsoft', 'certification', 'active', { countAs: 'mct' }),
      other: item('microsoft', 'certification', 'active'),
    });
    expect(counts.microsoft).toBe(2);
  });
});

describe('tokens', () => {
  const counts = { aws: 4, microsoft: 19 };
  it('allowlists exactly two tokens', () => {
    expect(Object.keys(TOKEN_VENDORS)).toEqual(['aws-certifications', 'microsoft-certifications']);
  });
  it('detects tokens outside the allowlist, including unterminated ones', () => {
    expect(hasBadToken('${aws-certifications} fine')).toBe(false);
    expect(hasBadToken('${other}')).toBe(true);
    expect(hasBadToken('${aws-certifications')).toBe(true);
    expect(hasBadToken('plain $ text')).toBe(false);
  });
  it('resolves allowlisted tokens to decimal integers and leaves other text alone', () => {
    expect(resolveTokens('${aws-certifications}x and ${microsoft-certifications}x', counts)).toBe('4x and 19x');
    expect(resolveTokens('${nope}', counts)).toBe('${nope}');
  });
  it('resolves deep structures', () => {
    expect(resolveDeep({ a: ['${aws-certifications}', { b: 'x' }], n: 2, z: null }, counts)).toEqual({ a: ['4', { b: 'x' }], n: 2, z: null });
  });
  it('walks every string with its JSON pointer', () => {
    const seen = [];
    walkStrings({ a: ['x', { b: 'y' }], n: 1, z: null }, (t, p) => seen.push([t, p]));
    expect(seen).toEqual([
      ['x', '/a/0'],
      ['y', '/a/1/b'],
    ]);
  });
});
