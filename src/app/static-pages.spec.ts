import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { IMAGE_LOADER_PROVIDER, imageSrc } from './content/image';
import { Home } from './home/home';
import { Biography } from './biography/biography';
import { Blog } from './blog/blog';
import { Portfolio } from './portfolio/portfolio';
import { SpecialAwards } from './special-awards/special-awards';
import { dividerSegments } from './shared/divider-segments';
import { Cv, chunk, skillLayout } from './portfolio/cv/cv';
import { CareerHistory, columnClasses, isGroup } from './portfolio/career-history/career-history';
import { Projects } from './portfolio/projects/projects';
import { NotFound } from './not-found/not-found';
import { BIOGRAPHY } from './content/generated/biography';
import { BLOG } from './content/generated/blog';
import { CAREER_HISTORY } from './content/generated/career-history';
import { CV } from './content/generated/cv';
import { HOME } from './content/generated/home';
import { NOT_FOUND } from './content/generated/not-found';
import { PAGES } from './content/generated/pages';
import { PORTFOLIO } from './content/generated/portfolio';
import { PROJECTS } from './content/generated/projects';
import { SPECIAL_AWARDS } from './content/generated/special-awards';

// These specs run against the synthetic fixture content (npm run content:fixtures).
async function render(component: Type<unknown>): Promise<HTMLElement> {
  TestBed.configureTestingModule({ imports: [component], providers: [provideRouter([]), IMAGE_LOADER_PROVIDER] });
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

  it('Home images carry width, height and a srcset, and only the profile and the first row are loaded with priority', async () => {
    const el = await render(Home);
    const all = imgs(el);
    for (const i of all) {
      expect(Number(i.getAttribute('width'))).toBeGreaterThan(0);
      expect(Number(i.getAttribute('height'))).toBeGreaterThan(0);
      expect(i.getAttribute('srcset')).toMatch(/^\/img\/[0-9a-f]{16}\/\d+\.webp \d+w/);
    }
    const eager = all.filter((i) => i.getAttribute('fetchpriority') === 'high').map((i) => i.alt);
    expect(eager).toEqual([HOME.profile.alt, ...HOME.tiles.slice(0, 3).map((t) => t.image.alt)]);
    expect(all.slice(4).every((i) => i.getAttribute('loading') === 'lazy')).toBe(true);
  });

  it('Home renders the name, profile picture, tagline with dividers, about paragraphs and tiles in order', async () => {
    const el = await render(Home);
    expect(text(el.querySelector('h3'))).toBe(HOME.name);
    expect(el.querySelector('.about-card img')?.getAttribute('src')).toBe(imageSrc(HOME.profile));
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
    expect(el.querySelector('img')?.getAttribute('src')).toBe(imageSrc(BIOGRAPHY.portrait));
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

  it('Cv takes its heading and breadcrumb from the page content and links back to the portfolio', async () => {
    const el = await render(Cv);
    expect(text(el.querySelector('h1'))).toBe(PAGES['cv'].heading);
    expect(text(el.querySelector('.breadcrumb-item.current'))).toBe(PAGES['cv'].breadcrumb);
    expect(el.querySelector('a.back')?.getAttribute('href')).toBe('/portfolio');
  });

  it('Cv builds mailto and tel links from the typed contact fields', async () => {
    const el = await render(Cv);
    const email = el.querySelector('a[title="Email"]');
    const phone = el.querySelector('a[title="Phone"]');
    expect(email?.getAttribute('href')).toBe('mailto:' + CV.contact.email);
    expect(email?.textContent).toBe(CV.contact.email);
    expect(phone?.getAttribute('href')).toBe('tel:' + CV.contact.phone.e164);
    expect(phone?.textContent).toBe(CV.contact.phone.display);
    expect(el.querySelector('a[href="' + CV.contact.website + '"]')?.textContent).toBe(CV.contact.website);
    expect(el.textContent).toContain(CV.contact.location);
  });

  it('Cv renders every section heading, in order', async () => {
    const el = await render(Cv);
    expect(Array.from(el.querySelectorAll('h3')).map((h) => h.textContent)).toEqual([
      CV.name,
      CV.contact.heading,
      CV.skills.heading,
      CV.experience.heading,
      CV.awards.heading,
      CV.organizations.heading,
      CV.education.heading,
      CV.volunteer.heading,
      CV.languages.heading,
      CV.interests.heading,
    ]);
    expect(el.textContent).toContain(CV.summary[0]);
  });

  it('Cv lays out skills in rows, positions with dividers, and awards with the optional flag and link', async () => {
    const el = await render(Cv);
    const skills = CV.skills.rows.flat();
    const skillCells = Array.from(el.querySelectorAll('.contact .row.pb-3 > div')).map((c) => c.textContent).filter((t) => t && skills.includes(t));
    expect(skillCells).toEqual(skills);
    expect(el.querySelector('.row.pb-3 > .col-1 + .col-3')).not.toBeNull();
    const periods = Array.from(el.querySelectorAll('h5 sub')).map((x) => x.textContent?.trim());
    expect(periods).toEqual(CV.experience.employers.flatMap((e) => e.positions.map((p) => p.period)));
    expect(el.querySelectorAll('h5 .devider').length).toBeGreaterThan(0);
    expect(text(el.querySelector('sup.todo'))).toBe(CV.awards.items[0].flag);
    expect(el.querySelector('a[href="' + CV.awards.items[0].link!.url + '"]')?.textContent).toBe(CV.awards.items[0].link!.text);
    expect(el.textContent).toContain(CV.awards.items[1].note!);
  });

  it('Cv lists the organizations twice, with descriptions bare or in a paragraph', async () => {
    const el = await render(Cv);
    for (const org of CV.organizations.items) {
      expect(el.querySelectorAll('a[href="' + org.url + '"]').length).toBe(2);
      expect(el.textContent).toContain(org.description);
    }
    const bare = CV.organizations.items.find((o) => o.bare)!;
    const cell = Array.from(el.querySelectorAll('.col-5')).find((c) => c.textContent?.trim() === bare.description);
    expect(cell?.querySelector('p')).toBeNull();
    expect(el.querySelectorAll('.row .col > hr').length).toBe(Math.ceil(CV.organizations.items.length / 2) - 1);
    expect(el.textContent).toContain(CV.organizations.items[0].roles.join(' ● '));
  });

  it('Cv renders education, languages and interests', async () => {
    const el = await render(Cv);
    for (const item of CV.education.items) expect(el.textContent).toContain(item.institution);
    for (const language of CV.languages.items) expect(el.textContent).toContain(language.level);
    expect(Array.from(el.querySelectorAll('.col > h5')).map((h) => h.textContent)).toEqual(CV.interests.rows.flat());
  });

  it('CV helpers split rows and pick column classes', () => {
    expect(chunk([1, 2, 3], 2)).toEqual([[1, 2], [3]]);
    expect(chunk([], 2)).toEqual([]);
    expect(skillLayout(['a', 'b', 'c', 'd'])).toEqual({ offset: 'col-1', cols: ['col-3', 'col-3', 'col-3', 'col-2'] });
    expect(skillLayout(['a', 'b', 'c'])).toEqual({ offset: 'col-3', cols: ['col-3', 'col-3', 'col-3'] });
  });

  it('CareerHistory renders employers collapsed with their positions, responsibilities and references', async () => {
    const el = await render(CareerHistory);
    expect(text(el.querySelector('h1'))).toBe(PAGES['career-history'].heading);
    expect(text(el.querySelector('.breadcrumb-item.current'))).toBe(PAGES['career-history'].breadcrumb);
    expect(el.querySelector('a.back')?.getAttribute('href')).toBe('/portfolio');
    const toggles = Array.from(el.querySelectorAll('[data-bs-toggle="collapse"]'));
    expect(toggles.map((t) => t.getAttribute('data-bs-target'))).toEqual(CAREER_HISTORY.employers.map((e) => '#' + e.id));
    for (const employer of CAREER_HISTORY.employers) {
      const panel = el.querySelector('#' + employer.id + '.collapse')!;
      expect(panel.querySelectorAll('.careerdetails').length).toBe(employer.positions.length);
    }
    expect(el.querySelectorAll('.career h4 .devider').length).toBe(1);
    expect(Array.from(el.querySelectorAll('.careerdetails h4')).every((h) => h.textContent === CAREER_HISTORY.labels.positionDetails)).toBe(true);
    expect(el.querySelectorAll('.container-fluid-content > br').length).toBe(CAREER_HISTORY.employers.length - 1);
  });

  it('CareerHistory shows grouped and plain responsibilities, the reason label override and optional referees', async () => {
    const el = await render(CareerHistory);
    expect(el.querySelectorAll('.careerdetails ul ul').length).toBe(2);
    expect(Array.from(el.querySelectorAll('.careerdetails h5')).map((h) => h.textContent)).toContain('Reason for Leaving:');
    const referees = CAREER_HISTORY.employers.flatMap((e) => e.positions).filter((p) => p.referee);
    expect(Array.from(el.querySelectorAll('.careerdetails h5')).filter((h) => h.textContent === CAREER_HISTORY.labels.references).length).toBe(referees.length);
    expect(el.textContent).toContain(referees[0].referee!.email);
    const widths = Array.from(el.querySelectorAll('.careerdetails > .row:nth-child(3) > div:nth-child(2)')).map((d) => d.className);
    expect(widths).toEqual(['col-10', 'col-5', 'col-6']);
  });

  it('dividerSegments keeps the spaces around each divider in the piece that owns them', () => {
    expect(dividerSegments(['A'])).toEqual(['A']);
    expect(dividerSegments(['A'], '!')).toEqual(['A!']);
    expect(dividerSegments(['A', 'B', 'C'], ' (x)')).toEqual(['A ', ' B ', ' C (x)']);
    expect(dividerSegments([])).toEqual([]);
  });

  it('Cv keeps the space before the period outside the small text only when a position says so', async () => {
    const el = await render(Cv);
    const subs = Array.from(el.querySelectorAll('h5 sub')).map((x) => x.textContent);
    const positions = CV.experience.employers.flatMap((e) => e.positions);
    expect(subs).toEqual(positions.map((p) => (p.gap === 'outside' ? p.period : ' ' + p.period)));
  });

  it('career helpers pick column classes and tell groups from plain items', () => {
    expect(columnClasses('wide')).toEqual(['col-1', 'col-10', 'col-1']);
    expect(columnClasses('medium')).toEqual(['col-4', 'col-6', 'col-2']);
    expect(columnClasses('narrow')).toEqual(['col-4', 'col-5', 'col-3']);
    expect(isGroup('plain')).toBe(false);
    expect(isGroup({ group: 'g', items: [] })).toBe(true);
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
