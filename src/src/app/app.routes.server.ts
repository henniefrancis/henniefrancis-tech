import { RenderMode, ServerRoute } from '@angular/ssr';
import { EVENTS } from './public-speaking/data/events.data';
import { GALLERIES } from './public-speaking/data/galleries.data';
import { CERT_DETAILS } from './certifications/cert-detail/cert-details.data';

// Turn a data map keyed by "a/b" into prerender param objects { [a], [b] }.
function paramsFrom(map: Record<string, unknown>, a: string, b: string): Record<string, string>[] {
  return Object.keys(map).map((key) => {
    const slash = key.indexOf('/');
    return { [a]: key.slice(0, slash), [b]: key.slice(slash + 1) };
  });
}

export const serverRoutes: ServerRoute[] = [
  {
    path: 'public-speaking/:event/photos/:year',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => paramsFrom(GALLERIES, 'event', 'year'),
  },
  {
    path: 'public-speaking/:event/:year',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => paramsFrom(EVENTS, 'event', 'year'),
  },
  {
    path: 'certifications/microsoft/:type/:id',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => paramsFrom(CERT_DETAILS, 'type', 'id'),
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
