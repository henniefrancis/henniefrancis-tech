import { routes } from './app.routes';
import { Home } from './home/home';
import { CertDetail } from './certifications/cert-detail/cert-detail';
import { Gallery } from './public-speaking/gallery/gallery';
import { EventDetail } from './public-speaking/event-detail/event-detail';
import { NotFound } from './not-found/not-found';

describe('routes', () => {
  const byPath = (p: string) => routes.find((r) => r.path === p);

  it('maps the home route', () => {
    expect(byPath('')?.component).toBe(Home);
    expect(byPath('')?.title).toBe('Hennie Francis');
  });

  it('keeps the 10 top-level pages (including home), 3 portfolio pages and the not-found page with titles', () => {
    const titled = routes.filter((r) => r.title);
    expect(titled.length).toBe(15);
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

  it('shows the not-found page for unknown paths, as the last route, marked noindex', () => {
    const last = routes[routes.length - 1];
    expect(last.path).toBe('**');
    expect(last.component).toBe(NotFound);
    expect(last.redirectTo).toBeUndefined();
    expect(last.data).toEqual({ noindex: true });
    expect(byPath('404')?.component).toBe(NotFound);
    expect(byPath('404')?.data).toEqual({ noindex: true });
  });
});
