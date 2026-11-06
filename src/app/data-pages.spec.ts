import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SocialMedia, buildSocials } from './social-media/social-media';
import { TechStack, buildTechGroups } from './tech-stack/tech-stack';
import { PublicSpeaking, buildYears, toRoute } from './public-speaking/public-speaking';
import { Certifications, buildCertGroups, isExternal } from './certifications/certifications';
import { CurrentRole, buildFacts, buildLogo } from './current-role/current-role';

async function render(component: Type<unknown>): Promise<HTMLElement> {
  TestBed.configureTestingModule({ imports: [component], providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(component);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('SocialMedia', () => {
  it('renders one linked icon per item from the data file', async () => {
    const el = await render(SocialMedia);
    const links = el.querySelectorAll('.socials a');
    expect(links.length).toBeGreaterThan(0);
    expect(Array.from(links).every((a) => a.getAttribute('rel') === 'noopener noreferrer')).toBe(true);
  });

  it('buildSocials sorts by order (unordered last), prefixes the image base and tolerates empty data', () => {
    const out = buildSocials({
      imageBaseUrl: 'b/',
      items: [
        { name: 'C', url: 'u3', image: 'c.png' },
        { name: 'B', url: 'u2', image: 'b.png', order: 2 },
        { name: 'A', url: 'u1', image: 'a.png', order: 1 },
      ],
    });
    expect(out.map((s) => s.name)).toEqual(['A', 'B', 'C']);
    expect(out[0]).toEqual({ name: 'A', url: 'u1', src: 'b/a.png' });
    expect(buildSocials({})).toEqual([]);
    expect(buildSocials({ items: [{ name: 'X', url: 'u', image: 'x.png' }] })[0].src).toBe('x.png');
  });
});

describe('TechStack', () => {
  it('renders a heading per group from the data file', async () => {
    const el = await render(TechStack);
    expect(el.querySelectorAll('h4').length).toBeGreaterThan(0);
    expect(el.querySelectorAll('img.techstack').length).toBeGreaterThan(0);
  });

  it('buildTechGroups sorts groups and tools and tolerates missing fields', () => {
    const out = buildTechGroups({
      imageBaseUrl: 'b/',
      categories: [
        { name: 'G2', items: [{ name: 'T', url: 'u', image: 't.png' }] },
        {
          name: 'G1',
          order: 1,
          items: [
            { name: 'T2', url: 'u2', image: '2.png', order: 2 },
            { name: 'T1', url: 'u1', image: '1.png', order: 1 },
          ],
        },
        { name: 'Empty', order: 5 },
      ],
    });
    expect(out.map((g) => g.name)).toEqual(['G1', 'Empty', 'G2']);
    expect(out[0].tools.map((t) => t.src)).toEqual(['b/1.png', 'b/2.png']);
    expect(out[1].tools).toEqual([]);
    expect(buildTechGroups({})).toEqual([]);
    expect(buildTechGroups({ categories: [{ name: 'N', items: [{ name: 'a', url: 'u', image: 'i' }] }] })[0].tools[0].src).toBe('i');
  });
});

describe('PublicSpeaking', () => {
  it('renders a heading per year from the data file', async () => {
    const el = await render(PublicSpeaking);
    expect(el.querySelectorAll('h4').length).toBeGreaterThan(0);
    const hrefs = Array.from(el.querySelectorAll('a[title]')).map((a) => a.getAttribute('href') ?? '');
    expect(hrefs.some((h) => h.startsWith('/public-speaking/'))).toBe(true);
  });

  it('toRoute maps legacy page paths to clean routes', () => {
    expect(toRoute('../pages/public-speaking/aws-summit/2024.html')).toBe('/public-speaking/aws-summit/2024');
    expect(toRoute('/x/y')).toBe('/x/y');
  });

  it('buildYears sorts, maps routes and tolerates missing fields', () => {
    const out = buildYears({
      imageBaseUrl: 'b/',
      categories: [
        { name: 'Y2', items: [{ name: 'T', url: '../pages/a/b.html', image: 't.png' }] },
        {
          name: 'Y1',
          order: 1,
          items: [
            { name: 'B', url: '../pages/a/2.html', image: '2.png', order: 2 },
            { name: 'A', url: '../pages/a/1.html', image: '1.png', order: 1 },
          ],
        },
        { name: 'Empty', order: 3 },
      ],
    });
    expect(out.map((y) => y.name)).toEqual(['Y1', 'Empty', 'Y2']);
    expect(out[0].talks).toEqual([
      { name: 'A', route: '/a/1', src: 'b/1.png' },
      { name: 'B', route: '/a/2', src: 'b/2.png' },
    ]);
    expect(out[1].talks).toEqual([]);
    expect(buildYears({})).toEqual([]);
    expect(buildYears({ categories: [{ name: 'N', items: [{ name: 'a', url: 'u', image: 'i' }] }] })[0].talks[0].src).toBe('i');
  });
});

describe('Certifications', () => {
  it('renders a heading per category from the data file', async () => {
    const el = await render(Certifications);
    expect(el.querySelectorAll('h4').length).toBeGreaterThan(0);
    expect(el.querySelectorAll('label').length).toBeGreaterThan(0);
  });

  it('isExternal detects http(s) URLs only', () => {
    expect(isExternal('https://x.test/a')).toBe(true);
    expect(isExternal('HTTP://x.test')).toBe(true);
    expect(isExternal('/pages/certifications/a.html')).toBe(false);
    expect(isExternal(undefined as unknown as string)).toBe(false);
  });

  it('buildCertGroups resolves external and internal targets, status text and ordering', () => {
    const out = buildCertGroups({
      imageBaseUrl: 'b/',
      categories: [
        {
          name: 'Late',
          items: [{ name: 'L', url: 'https://c.test/1', image: 'l.png', status: 'todo' }],
        },
        {
          name: 'First',
          order: 1,
          items: [
            { name: 'Int', url: '/pages/certifications/microsoft/mcts/X.html', image: 'i.png', status: 'inprogress', order: 2 },
            { name: 'Ext', url: 'https://c.test/2', image: 'e.png', status: 'active', order: 1 },
            { name: 'Odd', url: 'https://c.test/3', image: 'o.png', status: 'weird', order: 3 },
          ],
        },
        { name: 'Empty', order: 2 },
      ],
    });
    expect(out.map((g) => g.name)).toEqual(['First', 'Empty', 'Late']);
    const [ext, int, odd] = out[0].badges;
    expect(ext).toMatchObject({ external: true, href: 'https://c.test/2', route: null, statusText: 'active', src: 'b/e.png' });
    expect(int).toMatchObject({ external: false, href: null, route: '/certifications/microsoft/mcts/X', statusText: 'in progress' });
    expect(odd.statusText).toBe('weird');
    expect(out[1].badges).toEqual([]);
    expect(out[2].badges[0].statusText).toBe('to do');
    expect(buildCertGroups({})).toEqual([]);
    expect(
      buildCertGroups({ categories: [{ name: 'N', items: [{ name: 'a', url: 'https://x.test', image: 'i', status: 'active' }] }] })[0].badges[0].src,
    ).toBe('i');
  });
});

describe('CurrentRole (the page stays empty on purpose)', () => {
  it('renders only the heading and breadcrumb, no logo and no fact rows', async () => {
    const el = await render(CurrentRole);
    expect(el.querySelector('h1')?.textContent).toBe('Current Role');
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('h5')).toBeNull();
  });

  it('buildLogo returns the first image, with defaults, or null when there is none', () => {
    expect(
      buildLogo({ imageBaseUrl: 'b/', images: [{ url: 'u', className: 'c', name: 'N', image: 'i.svg' }] }),
    ).toEqual({ href: 'u', className: 'c', name: 'N', src: 'b/i.svg' });
    expect(buildLogo({ images: [{ url: 'u', image: 'i.svg' }] })).toEqual({ href: 'u', className: '', name: '', src: 'i.svg' });
    expect(buildLogo({ images: [] })).toBeNull();
    expect(buildLogo({})).toBeNull();
  });

  it('buildFacts keeps non-empty string fields in file order and skips reserved keys', () => {
    expect(
      buildFacts({
        version: 1,
        imageBaseUrl: 'b/',
        images: [],
        Employer: 'E',
        Blank: '  ',
        Count: 3,
        Title: 'T',
      }),
    ).toEqual([
      { label: 'Employer', value: 'E' },
      { label: 'Title', value: 'T' },
    ]);
  });
});
