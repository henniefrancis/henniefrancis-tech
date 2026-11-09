import { describe, expect, it } from 'vitest';
import { PROFILES, PROFILE_NAMES, profileFor } from '../src/profiles.mjs';

describe('profiles', () => {
  it('defines photo and header at 480, 960 and 1600', () => {
    expect(PROFILES.photo).toEqual([480, 960, 1600]);
    expect(PROFILES.header).toEqual([480, 960, 1600]);
  });

  it('keeps every profile to at most 3 ascending widths', () => {
    for (const name of PROFILE_NAMES) {
      const widths = PROFILES[name];
      expect(widths.length).toBeGreaterThan(0);
      expect(widths.length).toBeLessThanOrEqual(3);
      expect([...widths].sort((a, b) => a - b)).toEqual([...widths]);
    }
  });

  it('derives 1x and 2x profiles from the baseline display sizes', () => {
    expect(PROFILES.tile).toEqual([449, 898]);
    expect(PROFILES.badge).toEqual([150, 300]);
    expect(PROFILES.icon).toEqual([100, 200]);
  });

  it.each([
    ['/k/index/profile.png', '', 'profile'],
    ['/k/index/blog.png', '', 'tile'],
    ['/k/biography/portrait.png', '', 'portrait'],
    ['/k/certifications/microsoft/certificates/mct/x.png', '', 'photo'],
    ['/k/certifications/aws/x.png', '', 'badge'],
    ['/k/tech-stack/x.png', '', 'icon'],
    ['/k/social-media/x.png', '', 'logo'],
    ['/k/public-speaking/x.png', '.links.[]', 'logo'],
    ['/k/public-speaking/x.png', '.header', 'header'],
    ['/k/event-photos/a/p1.jpg', '.photos.[]', 'photo'],
    ['/k/anything/else.png', '', 'photo'],
  ])('maps %s (%s) to %s', (urlPath, ctx, expected) => {
    expect(profileFor(urlPath, ctx)).toBe(expected);
  });

  it('defaults ctx to empty', () => {
    expect(profileFor('/k/index/a.png')).toBe('tile');
  });
});
