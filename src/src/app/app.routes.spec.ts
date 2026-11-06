import { routes } from './app.routes';
import { Home } from './home/home';
import { CertDetail } from './certifications/cert-detail/cert-detail';
import { Gallery } from './public-speaking/gallery/gallery';
import { EventDetail } from './public-speaking/event-detail/event-detail';

describe('routes', () => {
  const byPath = (p: string) => routes.find((r) => r.path === p);

  it('maps the home route', () => {
    expect(byPath('')?.component).toBe(Home);
    expect(byPath('')?.title).toBe('Hennie Francis');
  });

  it('keeps the 10 top-level pages (including home) and 3 portfolio pages with titles', () => {
    const titled = routes.filter((r) => r.title);
    expect(titled.length).toBe(13);
    expect(byPath('current-role')?.title).toBe("Hennie's Current Role");
    expect(byPath('portfolio/cv')?.title).toBe("Hennie's CV");
  });

  it('puts the gallery route before the more general event route', () => {
    const gallery = routes.findIndex((r) => r.path === 'public-speaking/:event/photos/:year');
    const event = routes.findIndex((r) => r.path === 'public-speaking/:event/:year');
    expect(gallery).toBeGreaterThanOrEqual(0);
    expect(gallery).toBeLessThan(event);
    expect(routes[gallery].component).toBe(Gallery);
    expect(routes[event].component).toBe(EventDetail);
  });

  it('maps certificate detail pages', () => {
    expect(byPath('certifications/microsoft/:type/:id')?.component).toBe(CertDetail);
  });

  it('falls back to home for unknown paths, as the last route', () => {
    const last = routes[routes.length - 1];
    expect(last.path).toBe('**');
    expect(last.redirectTo).toBe('');
  });
});
