// Image profiles: the widths (px) of the WebP variants generated for each use.
//
// photo and header use 480, 960 and 1600. The others are 1x and 2x of the
// displayed width measured from the desktop 1920 px reference layout:
//   tile      home and portfolio tiles, widest 448.17 px           -> 449, 898
//   profile   home profile photo, 174.34 px                        -> 175, 350
//   portrait  biography portrait, 393.5 px                         -> 394, 788
//   badge     certification badges, 150 px                         -> 150, 300
//   icon      tech stack icons, 100 px                             -> 100, 200
//   logo      social and event logos, widest 350 px (blog)         -> 350, 700
// Variants are never upscaled: a source narrower than a width gets its own width instead.

export const PROFILES = Object.freeze({
  photo: Object.freeze([480, 960, 1600]),
  header: Object.freeze([480, 960, 1600]),
  tile: Object.freeze([449, 898]),
  profile: Object.freeze([175, 350]),
  portrait: Object.freeze([394, 788]),
  badge: Object.freeze([150, 300]),
  icon: Object.freeze([100, 200]),
  logo: Object.freeze([350, 700]),
});

export const PROFILE_NAMES = Object.freeze(Object.keys(PROFILES));

// First match wins. `path` is tested against the image URL path (or the uploaded
// file path); `ctx` is the JSON key path of the reference, when the reference came from JSON.
const RULES = [
  { path: /\/index\/profile\.[a-z]+$/i, profile: 'profile' },
  { path: /\/index\//i, profile: 'tile' },
  { path: /\/biography\//i, profile: 'portrait' },
  { path: /\/certifications\/microsoft\/certificates\//i, profile: 'photo' },
  { path: /\/certifications\//i, profile: 'badge' },
  { path: /\/tech-stack\//i, profile: 'icon' },
  { path: /\/social-media\//i, profile: 'logo' },
  { ctx: /\.links\./, profile: 'logo' },
  { path: /\/public-speaking\//i, profile: 'header' },
  { path: /\/event-photos\//i, profile: 'photo' },
];

/** Pick a profile for a source image. Falls back to `photo`. */
export function profileFor(urlPath, ctx = '') {
  for (const rule of RULES) {
    if (rule.path && !rule.path.test(urlPath)) continue;
    if (rule.ctx && !rule.ctx.test(ctx)) continue;
    return rule.profile;
  }
  return 'photo';
}
