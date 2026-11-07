import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Home } from './home/home';
import { Biography } from './biography/biography';
import { Blog } from './blog/blog';
import { Portfolio } from './portfolio/portfolio';
import { SpecialAwards } from './special-awards/special-awards';
import { Cv } from './portfolio/cv/cv';
import { CareerHistory } from './portfolio/career-history/career-history';
import { Projects } from './portfolio/projects/projects';
import { NotFound } from './not-found/not-found';
import { BIOGRAPHY } from './content/generated/biography';
import { BLOG } from './content/generated/blog';
import { HOME } from './content/generated/home';
import { NOT_FOUND } from './content/generated/not-found';
import { PAGES } from './content/generated/pages';
import { PORTFOLIO } from './content/generated/portfolio';
import { PROJECTS } from './content/generated/projects';
import { SPECIAL_AWARDS } from './content/generated/special-awards';

// These specs run against the synthetic fixture content (npm run content:fixtures).
async function render(component: Type<unknown>): Promise<HTMLElement> {
  TestBed.configureTestingModule({ imports: [component], providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(component);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

const imgs = (el: HTMLElement) => Array.from(el.querySelectorAll('img'));
const text = (el: Element | null) => el?.textContent?.trim();

describe('static pages', () => {
  it('Home has one visually hidden h1 from the page heading and every image has alt text', async () => {
    const el = await render(Home);
    const h1 = el.querySelectorAll('h1');
    expect(h1.length).toBe(1);
    expect(h1[0].textContent).toBe(PAGES['home'].heading);
    expect(h1[0].classList.contains('visually-hidden')).toBe(true);
    expect(imgs(el).every((i) => (i.getAttribute('alt') ?? '').length > 0)).toBe(true);
  });

  it('Home renders the name, profile picture, tagline with dividers, about paragraphs and tiles in order', async () => {
    const el = await render(Home);
    expect(text(el.querySelector('h3'))).toBe(HOME.name);
    expect(el.querySelector('.about-card img')?.getAttribute('src')).toBe(HOME.profile.src);
    expect(el.querySelector('.about-card img')?.getAttribute('alt')).toBe(HOME.profile.alt);
    const tagline = el.querySelector('.bio p');
    expect(tagline?.querySelectorAll('.devider').length).toBe(HOME.tagline.length - 1);
    expect(tagline?.textContent).toBe(HOME.tagline.join(' ● '));
    const paragraphs = Array.from(el.querySelectorAll('.bio p')).slice(1);
    expect(paragraphs.map((p) => p.textContent)).toEqual(HOME.about);
    expect(el.querySelectorAll('.bio hr').length).toBe(HOME.about.length);
    const tiles = el.querySelectorAll('.col-9 a[title]');
    expect(Array.from(tiles).map((a) => a.getAttribute('href'))).toEqual(HOME.tiles.map((t) => t.route));
    expect(Array.from(tiles).map((a) => a.querySelector('img')?.getAttribute('alt'))).toEqual(HOME.tiles.map((t) => t.image.alt));
  });

  it('Biography renders the portrait and every paragraph', async () => {
    const el = await render(Biography);
    expect(text(el.querySelector('h1'))).toBe(PAGES['biography'].heading);
    expect(text(el.querySelector('.breadcrumb-item.current'))).toBe(PAGES['biography'].breadcrumb);
    expect(el.querySelector('img')?.getAttribute('src')).toBe(BIOGRAPHY.portrait.src);
    expect(el.querySelector('img')?.getAttribute('alt')).toBe(BIOGRAPHY.portrait.alt);
    expect(Array.from(el.querySelectorAll('.biography p')).map((p) => p.textContent)).toEqual(BIOGRAPHY.paragraphs);
  });

  it('Blog shows the intro and its external links safely', async () => {
    const el = await render(Blog);
    expect(text(el.querySelector('h1'))).toBe(PAGES['blog'].heading);
    expect(text(el.querySelector('p'))).toBe(BLOG.intro);
    const links = Array.from(el.querySelectorAll('a[target="_blank"]'));
    expect(links.map((a) => a.getAttribute('title'))).toEqual(BLOG.links.map((l) => l.name));
    expect(links.map((a) => a.getAttribute('href'))).toEqual(BLOG.links.map((l) => l.url));
    expect(links.every((a) => a.getAttribute('rel') === 'noopener noreferrer')).toBe(true);
  });

  it('Portfolio links to the tiles it lists', async () => {
    const el = await render(Portfolio);
    expect(text(el.querySelector('h1'))).toBe(PAGES['portfolio'].heading);
    const hrefs = Array.from(el.querySelectorAll('a[title]:not(.back)')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(PORTFOLIO.tiles.map((t) => t.route));
    expect(imgs(el).map((i) => i.alt)).toEqual(PORTFOLIO.tiles.map((t) => t.image.alt));
  });

  it('SpecialAwards shows every award slide, first one active', async () => {
    const el = await render(SpecialAwards);
    expect(text(el.querySelector('h1'))).toBe(PAGES['special-awards'].heading);
    expect(imgs(el).map((i) => i.alt)).toEqual(SPECIAL_AWARDS.slides.map((s) => s.alt));
    expect(el.querySelector('.carousel-item')?.classList.contains('active')).toBe(true);
  });

  it('Projects renders each project, with the badge and diagram only when present', async () => {
    const el = await render(Projects);
    expect(text(el.querySelector('h1'))).toBe(PAGES['projects'].heading);
    expect(Array.from(el.querySelectorAll('h2')).map((h) => h.textContent)).toEqual(PROJECTS.projects.map((p) => p.name));
    expect(el.querySelectorAll('.badge').length).toBe(PROJECTS.projects.filter((p) => p.badge).length);
    expect(el.querySelectorAll('img.img-fluid').length).toBe(PROJECTS.projects.filter((p) => p.diagram).length);
    expect(el.textContent).toContain(PROJECTS.projects[0].description[0]);
    expect(el.querySelector('a.back')?.getAttribute('href')).toBe('/portfolio');
    expect(el.querySelector('.breadcrumb-item a[href="/portfolio"]')?.textContent).toBe(PAGES['portfolio'].breadcrumb);
  });

  it.each([
    ['Cv', Cv, 'cv'],
    ['CareerHistory', CareerHistory, 'career-history'],
  ] as [string, Type<unknown>, 'cv' | 'career-history'][])('%s takes its heading and breadcrumb from the page content', async (_name, component, key) => {
    const el = await render(component);
    expect(text(el.querySelector('h1'))).toBe(PAGES[key].heading);
    expect(text(el.querySelector('.breadcrumb-item.current'))).toBe(PAGES[key].breadcrumb);
    expect(el.querySelector('a.back')?.getAttribute('href')).toBe('/portfolio');
  });

  it('NotFound explains the problem, has one h1 and links home', async () => {
    const el = await render(NotFound);
    expect(el.querySelectorAll('h1').length).toBe(1);
    expect(text(el.querySelector('h1'))).toBe(PAGES['not-found'].heading);
    expect(el.textContent).toContain(NOT_FOUND.message[0]);
    expect(text(el.querySelector('p a'))).toBe(NOT_FOUND.homeLink);
    expect(Array.from(el.querySelectorAll('a')).every((a) => a.getAttribute('href') === '/')).toBe(true);
  });
});
