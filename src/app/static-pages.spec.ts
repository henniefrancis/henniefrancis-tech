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

async function render(component: Type<unknown>): Promise<HTMLElement> {
  TestBed.configureTestingModule({ imports: [component], providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(component);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

const imgs = (el: HTMLElement) => Array.from(el.querySelectorAll('img'));

describe('static pages', () => {
  it('Home has one visually hidden h1 and every tile image has a name', async () => {
    const el = await render(Home);
    const h1 = el.querySelectorAll('h1');
    expect(h1.length).toBe(1);
    expect(h1[0].textContent).toBe('Hennie Francis');
    expect(h1[0].classList.contains('visually-hidden')).toBe(true);
    expect(imgs(el).every((i) => (i.getAttribute('alt') ?? '').length > 0)).toBe(true);
  });

  it('Home renders the profile picture and one tile per section, in order', async () => {
    const el = await render(Home);
    const tiles = imgs(el).filter((i) => i.alt !== 'Profile Picture');
    expect(el.querySelector('img[alt="Profile Picture"]')?.getAttribute('src')).toMatch(/^\/img\/[0-9a-f]{16}\/\d+\.webp$/);
    expect(tiles.map((i) => i.alt)).toEqual([
      'Biography',
      'Current Role',
      'Portfolio of Evidence',
      'Social Media',
      'Public Speaking',
      'Blog',
      'Tech Stack',
      'Certifications',
      'Special Awards',
    ]);
    const hrefs = Array.from(el.querySelectorAll('a[title]')).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/current-role');
    expect(hrefs).toContain('/special-awards');
  });

  it('Biography renders the portrait and every paragraph', async () => {
    const el = await render(Biography);
    expect(el.querySelector('h1')?.textContent).toBe('Biography');
    expect(el.querySelector('img')?.getAttribute('src')).toMatch(/^\/img\/[0-9a-f]{16}\/\d+\.webp$/);
    expect(el.textContent).toContain('Cape Town, South Africa');
    expect(el.querySelectorAll('p').length).toBeGreaterThanOrEqual(9);
  });

  it('Blog links to Medium and DEV', async () => {
    const el = await render(Blog);
    expect(el.querySelector('h1')?.textContent).toBe('Tech Blog');
    const links = Array.from(el.querySelectorAll('a[target="_blank"]'));
    expect(links.map((a) => a.getAttribute('title'))).toEqual(['Medium', 'DEV']);
    expect(links.every((a) => a.getAttribute('rel') === 'noopener noreferrer')).toBe(true);
  });

  it('Portfolio links to the CV, career history and projects pages', async () => {
    const el = await render(Portfolio);
    expect(el.querySelector('h1')?.textContent).toBe('Portfolio');
    const hrefs = Array.from(el.querySelectorAll('a[title]:not(.back)')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/portfolio/cv', '/portfolio/career-history', '/portfolio/projects']);
  });

  it('SpecialAwards shows both award slides', async () => {
    const el = await render(SpecialAwards);
    expect(el.querySelector('h1')?.textContent).toBe('Special Awards');
    expect(imgs(el).map((i) => i.alt)).toEqual(['AWS Community Builder', 'Rockstar']);
  });

  it.each([
    ['Cv', Cv, 'Curriculum Vitae'],
    ['CareerHistory', CareerHistory, 'Career History'],
    ['Projects', Projects, 'Projects'],
  ] as [string, Type<unknown>, string][])('%s renders its heading', async (_name, component, heading) => {
    const el = await render(component);
    expect(el.querySelector('h1')?.textContent).toBe(heading);
    expect(el.querySelector('a.back')?.getAttribute('href')).toBe('/portfolio');
  });
});
