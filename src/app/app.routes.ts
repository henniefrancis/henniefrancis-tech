import { Routes } from '@angular/router';
import { PAGES } from './content/generated/pages';

// Every page is a lazy route, so a visitor downloads only the page code and the content that page shows.
const notFound = {
  loadComponent: () => import('./not-found/not-found').then((m) => m.NotFound),
  title: PAGES['not-found'].title,
  data: { noindex: true },
};

export const routes: Routes = [
  { path: '', loadComponent: () => import('./home/home').then((m) => m.Home), title: PAGES['home'].title },
  { path: 'biography', loadComponent: () => import('./biography/biography').then((m) => m.Biography), title: PAGES['biography'].title },
  { path: 'current-role', loadComponent: () => import('./current-role/current-role').then((m) => m.CurrentRole), title: PAGES['current-role'].title },
  { path: 'portfolio', loadComponent: () => import('./portfolio/portfolio').then((m) => m.Portfolio), title: PAGES['portfolio'].title },
  { path: 'social-media', loadComponent: () => import('./social-media/social-media').then((m) => m.SocialMedia), title: PAGES['social-media'].title },
  { path: 'public-speaking', loadComponent: () => import('./public-speaking/public-speaking').then((m) => m.PublicSpeaking), title: PAGES['public-speaking'].title },
  { path: 'blog', loadComponent: () => import('./blog/blog').then((m) => m.Blog), title: PAGES['blog'].title },
  { path: 'tech-stack', loadComponent: () => import('./tech-stack/tech-stack').then((m) => m.TechStack), title: PAGES['tech-stack'].title },
  { path: 'certifications', loadComponent: () => import('./certifications/certifications').then((m) => m.Certifications), title: PAGES['certifications'].title },
  { path: 'special-awards', loadComponent: () => import('./special-awards/special-awards').then((m) => m.SpecialAwards), title: PAGES['special-awards'].title },

  // Public-speaking sub-pages (gallery route is more specific, so it comes first).
  { path: 'public-speaking/:event/photos/:year', loadComponent: () => import('./public-speaking/gallery/gallery').then((m) => m.Gallery) },
  { path: 'public-speaking/:event/:year', loadComponent: () => import('./public-speaking/event-detail/event-detail').then((m) => m.EventDetail) },

  { path: 'portfolio/cv', loadComponent: () => import('./portfolio/cv/cv').then((m) => m.Cv), title: PAGES['cv'].title },
  { path: 'portfolio/career-history', loadComponent: () => import('./portfolio/career-history/career-history').then((m) => m.CareerHistory), title: PAGES['career-history'].title },
  { path: 'portfolio/projects', loadComponent: () => import('./portfolio/projects/projects').then((m) => m.Projects), title: PAGES['projects'].title },

  { path: 'certifications/microsoft/:type/:id', loadComponent: () => import('./certifications/cert-detail/cert-detail').then((m) => m.CertDetail) },

  // Anything else shows the styled not-found page. The "404" path exists only so the
  // build can prerender that page; tools/seo then moves it to 404.html.
  { path: '404', ...notFound },
  { path: '**', ...notFound },
];
