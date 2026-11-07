import { RenderMode } from '@angular/ssr';
import { serverRoutes } from './app.routes.server';
import { PRERENDER_PARAMS } from './content/generated/prerender';

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
    expect(p).toEqual(PRERENDER_PARAMS.galleries);
    expect(p).toContainEqual({ event: 'conf-one', year: '2025' });
  });

  it('prerenders one event page per event record', async () => {
    const p = await params('public-speaking/:event/:year');
    expect(p).toEqual(PRERENDER_PARAMS.events);
    expect(p).toContainEqual({ event: 'conf-one', year: '2025-lounge' });
  });

  it('prerenders one certificate page per certificate record', async () => {
    const p = await params('certifications/microsoft/:type/:id');
    expect(p).toEqual(PRERENDER_PARAMS.certDetails);
    expect(p).toContainEqual({ type: 'mcts', id: 'AAAAAAAA-0000-0000-0000-000000000001' });
  });
});
