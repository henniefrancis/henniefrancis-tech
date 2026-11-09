import { RenderMode, ServerRoute } from '@angular/ssr';
import { PRERENDER_PARAMS } from './content/generated/prerender';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'public-speaking/:event/photos/:year',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => PRERENDER_PARAMS.galleries,
  },
  {
    path: 'public-speaking/:event/:year',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => PRERENDER_PARAMS.events,
  },
  {
    path: 'certifications/microsoft/:type/:id',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => PRERENDER_PARAMS.certDetails,
  },
  {
    // Not a real page: the unknown-path route renders the not-found page here, and the
    // post-build step (tools/seo) moves the result to 404.html.
    path: '404',
    renderMode: RenderMode.Prerender,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
