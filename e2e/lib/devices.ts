import { devices } from '@playwright/test';
import type { Project } from '@playwright/test';

/**
 * The seven device projects. Visual runs force deviceScaleFactor 1 (see
 * VISUAL_DSF) so baselines stay small and comparable; viewport, user agent,
 * touch and mobile flags come from the Playwright device profiles.
 */
export const VISUAL_DSF = Number(process.env['E2E_DSF'] ?? '1');

const ipad = devices['iPad (gen 7)'];
const ipadLandscape = devices['iPad (gen 7) landscape'];
const iphone = devices['iPhone 15'];
const iphoneLandscape = devices['iPhone 15 landscape'];
const pixel = devices['Pixel 7'];

export const PROJECTS: Project[] = [
  {
    name: 'desktop-1280',
    use: { browserName: 'chromium', viewport: { width: 1280, height: 800 }, deviceScaleFactor: VISUAL_DSF },
  },
  {
    name: 'desktop-1920',
    use: { browserName: 'chromium', viewport: { width: 1920, height: 1080 }, deviceScaleFactor: VISUAL_DSF },
  },
  { name: 'ipad-portrait', use: { ...ipad, deviceScaleFactor: VISUAL_DSF } },
  { name: 'ipad-landscape', use: { ...ipadLandscape, deviceScaleFactor: VISUAL_DSF } },
  { name: 'iphone-portrait', use: { ...iphone, deviceScaleFactor: VISUAL_DSF } },
  { name: 'iphone-landscape', use: { ...iphoneLandscape, deviceScaleFactor: VISUAL_DSF } },
  { name: 'android', use: { ...pixel, deviceScaleFactor: VISUAL_DSF } },
];

export const PROJECT_NAMES = PROJECTS.map((p) => p.name as string);
