import { Route } from '@angular/router';
import { routes } from './app.routes';
import { Home } from './home/home';
import { Biography } from './biography/biography';
import { CurrentRole } from './current-role/current-role';
import { Portfolio } from './portfolio/portfolio';
import { SocialMedia } from './social-media/social-media';
import { PublicSpeaking } from './public-speaking/public-speaking';
import { Blog } from './blog/blog';
import { TechStack } from './tech-stack/tech-stack';
import { Certifications } from './certifications/certifications';
import { SpecialAwards } from './special-awards/special-awards';
import { CertDetail } from './certifications/cert-detail/cert-detail';
import { Gallery } from './public-speaking/gallery/gallery';
import { EventDetail } from './public-speaking/event-detail/event-detail';
import { Cv } from './portfolio/cv/cv';
import { CareerHistory } from './portfolio/career-history/career-history';
import { Projects } from './portfolio/projects/projects';
import { NotFound } from './not-found/not-found';
import { PAGES } from './content/generated/pages';

const byPath = (p: string) => routes.find((r) => r.path === p) as Route;
const load = async (route: Route) => (route.loadComponent as () => Promise<unknown>)();

describe('routes', () => {
  it.each([
    ['', Home, 'home'],
    ['biography', Biography, 'biography'],
    ['current-role', CurrentRole, 'current-role'],
    ['portfolio', Portfolio, 'portfolio'],
    ['social-media', SocialMedia, 'social-media'],
    ['public-speaking', PublicSpeaking, 'public-speaking'],
    ['blog', Blog, 'blog'],
    ['tech-stack', TechStack, 'tech-stack'],
    ['certifications', Certifications, 'certifications'],
    ['special-awards', SpecialAwards, 'special-awards'],
    ['portfolio/cv', Cv, 'cv'],
    ['portfolio/career-history', CareerHistory, 'career-history'],
    ['portfolio/projects', Projects, 'projects'],
  ] as [string, unknown, keyof typeof PAGES][])('lazy loads %j with its title from the page content', async (path, component, key) => {
    expect(byPath(path).component).toBeUndefined();
    expect(await load(byPath(path))).toBe(component);
    expect(byPath(path).title).toBe(PAGES[key].title);
  });

  it('lazy loads the sub pages', async () => {
    expect(await load(byPath('certifications/microsoft/:type/:id'))).toBe(CertDetail);
    expect(await load(byPath('public-speaking/:event/photos/:year'))).toBe(Gallery);
    expect(await load(byPath('public-speaking/:event/:year'))).toBe(EventDetail);
  });

  it('puts the gallery route before the more general event route', () => {
    const gallery = routes.findIndex((r) => r.path === 'public-speaking/:event/photos/:year');
    const event = routes.findIndex((r) => r.path === 'public-speaking/:event/:year');
    expect(gallery).toBeGreaterThanOrEqual(0);
    expect(gallery).toBeLessThan(event);
  });

  it('shows the not-found page for unknown paths, as the last route, marked noindex', async () => {
    const last = routes[routes.length - 1];
    expect(last.path).toBe('**');
    expect(await load(last)).toBe(NotFound);
    expect(last.redirectTo).toBeUndefined();
    expect(last.title).toBe(PAGES['not-found'].title);
    expect(last.data).toEqual({ noindex: true });
    expect(await load(byPath('404'))).toBe(NotFound);
    expect(byPath('404').data).toEqual({ noindex: true });
  });
});
