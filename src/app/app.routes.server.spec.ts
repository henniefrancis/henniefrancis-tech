import { RenderMode } from '@angular/ssr';
import { serverRoutes } from './app.routes.server';
import { EVENTS } from './public-speaking/data/events.data';
import { GALLERIES } from './public-speaking/data/galleries.data';
import { CERT_DETAILS } from './certifications/cert-detail/cert-details.data';

describe('serverRoutes', () => {
  const route = (path: string) => serverRoutes.find((r) => r.path === path)!;

  it('prerenders every route', () => {
    expect(serverRoutes.every((r) => r.renderMode === RenderMode.Prerender)).toBe(true);
    expect(serverRoutes[serverRoutes.length - 1].path).toBe('**');
  });

  it('prerenders the 404 path so the build can write 404.html, before the catch-all', () => {
    const paths = serverRoutes.map((r) => r.path);
    expect(paths.indexOf('404')).toBeGreaterThanOrEqual(0);
    expect(paths.indexOf('404')).toBeLessThan(paths.indexOf('**'));
  });

  async function params(path: string) {
    const r = route(path) as { getPrerenderParams: () => Promise<Record<string, string>[]> };
    return r.getPrerenderParams();
  }

  it('prerenders one gallery page per gallery record', async () => {
    const p = await params('public-speaking/:event/photos/:year');
    expect(p.length).toBe(Object.keys(GALLERIES).length);
    expect(p).toContainEqual({ event: 'aws-summit', year: '2025-cl' });
  });

  it('prerenders one event page per event record', async () => {
    const p = await params('public-speaking/:event/:year');
    expect(p.length).toBe(Object.keys(EVENTS).length);
    expect(p).toContainEqual({ event: 'aws-summit', year: '2024' });
  });

  it('prerenders one certificate page per certificate record, splitting on the first slash', async () => {
    const p = await params('certifications/microsoft/:type/:id');
    expect(p.length).toBe(Object.keys(CERT_DETAILS).length);
    for (const item of p) {
      expect(`${item['type']}/${item['id']}` in CERT_DETAILS).toBe(true);
    }
  });
});
