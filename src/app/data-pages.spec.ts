import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { IMAGE_LOADER_PROVIDER, imageView } from './content/image';
import { provideRouter } from '@angular/router';
import { SocialMedia, buildSocials } from './social-media/social-media';
import { TechStack, buildTechGroups } from './tech-stack/tech-stack';
import { PublicSpeaking, buildYears, toRoute } from './public-speaking/public-speaking';
import { Certifications, buildCertGroups, isExternal } from './certifications/certifications';
import { CurrentRole, buildFacts, buildLogo } from './current-role/current-role';

const ref = (id: string) => ({ id, w: 100, h: 50, widths: [100] });
const TILE = '(max-width: 499px) 100vw, (max-width: 699px) 50vw, 34vw';
const view = (id: string) => imageView(ref(id));

async function render(component: Type<unknown>): Promise<HTMLElement> {
  TestBed.configureTestingModule({ imports: [component], providers: [provideRouter([]), IMAGE_LOADER_PROVIDER] });
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

  it('shows an item without a url as an image only, not a link', async () => {
    const el = await render(SocialMedia);
    const unlinked = Array.from(el.querySelectorAll('.socials')).filter((d) => !d.querySelector('a'));
    expect(unlinked.length).toBeGreaterThan(0);
    expect(unlinked.every((d) => d.querySelector('img')?.getAttribute('alt'))).toBe(true);
    expect(el.querySelector('img[alt="dotcore Solutions"]')?.closest('a')).toBeNull();
    expect(buildSocials({ items: [{ name: 'N', image: ref('n') }] })[0].url).toBeUndefined();
  });

  it('buildSocials sorts by order (unordered last), builds image URLs from refs and tolerates empty data', () => {
    const out = buildSocials({
      items: [
        { name: 'C', url: 'u3', image: ref('c') },
        { name: 'B', url: 'u2', image: ref('b'), order: 2 },
        { name: 'A', url: 'u1', image: ref('a'), order: 1 },
      ],
    });
    expect(out.map((s) => s.name)).toEqual(['A', 'B', 'C']);
    expect(out[0]).toEqual({ name: 'A', url: 'u1', image: view('a') });
    expect(buildSocials({})).toEqual([]);
    expect(buildSocials({ items: [{ name: 'X', url: 'u', image: ref('x') }] })[0].image).toEqual(view('x'));
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
      categories: [
        { name: 'G2', items: [{ name: 'T', url: 'u', image: ref('t') }] },
        {
          name: 'G1',
          order: 1,
          items: [
            { name: 'B', url: 'u2', image: ref('2'), order: 2 },
            { name: 'A', url: 'u1', image: ref('1'), order: 1 },
          ],
        },
        { name: 'Empty', order: 5 },
      ],
    });
    expect(out.map((g) => g.name)).toEqual(['G1', 'Empty', 'G2']);
    expect(out[0].tools.map((t) => t.image.ngSrc)).toEqual(['1', '2']);
    expect(out[1].tools).toEqual([]);
    expect(buildTechGroups({})).toEqual([]);
    expect(buildTechGroups({ categories: [{ name: 'N', items: [{ name: 'a', url: 'u', image: ref('i') }] }] })[0].tools[0].image).toEqual(view('i'));
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
      categories: [
        { name: 'Y2', items: [{ name: 'T', url: '../pages/a/b.html', image: ref('t') }] },
        {
          name: 'Y1',
          order: 1,
          items: [
            { name: 'B', url: '../pages/a/2.html', image: ref('2'), order: 2 },
            { name: 'A', url: '../pages/a/1.html', image: ref('1'), order: 1 },
          ],
        },
        { name: 'Empty', order: 3 },
      ],
    });
    expect(out.map((y) => y.name)).toEqual(['Y1', 'Empty', 'Y2']);
    expect(out[0].talks).toEqual([
      { name: 'A', route: '/a/1', image: imageView(ref('1'), TILE) },
      { name: 'B', route: '/a/2', image: imageView(ref('2'), TILE) },
    ]);
    expect(out[1].talks).toEqual([]);
    expect(buildYears({})).toEqual([]);
    expect(buildYears({ categories: [{ name: 'N', items: [{ name: 'a', url: 'u', image: ref('i') }] }] })[0].talks[0].image).toEqual(imageView(ref('i'), TILE));
  });
});

describe('Certifications (items without a link and named items)', () => {
  it('shows the two badges whose pages were removed as an image and label without a link', async () => {
    const el = await render(Certifications);
    for (const name of ['AWS Educate Machine Learning - DeepRacer', 'AWS Knowledge: Storage Core']) {
      const img = el.querySelector(`img[alt="${name}"]`);
      expect(img).not.toBeNull();
      const anchor = img!.closest('a');
      expect(anchor?.hasAttribute('href')).toBe(false);
      expect(anchor?.querySelector('label')?.textContent).toMatch(/in progress|to do/);
    }
  });

  it('names every certification item', async () => {
    const el = await render(Certifications);
    const imgs = Array.from(el.querySelectorAll('.certification img'));
    expect(imgs.length).toBeGreaterThan(0);
    expect(imgs.every((i) => (i.getAttribute('alt') ?? '').length > 0)).toBe(true);
    expect(el.querySelector('img[alt="Microsoft Certified IT Professional: Database Developer 2008"]')).not.toBeNull();
    expect(el.querySelector('img[alt="Microsoft Certified IT Professional: Business Intelligence Developer 2008"]')).not.toBeNull();
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
      categories: [
        {
          name: 'Late',
          items: [{ name: 'L', url: 'https://c.test/1', image: ref('l'), status: 'todo' }],
        },
        {
          name: 'First',
          order: 1,
          items: [
            { name: 'Int', url: '/pages/certifications/microsoft/mcts/X.html', image: ref('i'), status: 'inprogress', order: 2 },
            { name: 'Ext', url: 'https://c.test/2', image: ref('e'), status: 'active', order: 1 },
            { name: 'Odd', url: 'https://c.test/3', image: ref('o'), status: 'weird', order: 3 },
          ],
        },
        { name: 'Empty', order: 2 },
      ],
    });
    expect(out.map((g) => g.name)).toEqual(['First', 'Empty', 'Late']);
    const [ext, int, odd] = out[0].badges;
    expect(ext).toMatchObject({ external: true, href: 'https://c.test/2', route: null, statusText: 'active', image: view('e') });
    expect(int).toMatchObject({ external: false, href: null, route: '/certifications/microsoft/mcts/X', statusText: 'in progress' });
    expect(odd.statusText).toBe('weird');
    expect(out[1].badges).toEqual([]);
    expect(out[2].badges[0].statusText).toBe('to do');
    const unlinked = buildCertGroups({ categories: [{ name: 'N', items: [{ name: 'a', image: ref('u'), status: 'todo' }] }] })[0].badges[0];
    expect(unlinked).toMatchObject({ external: false, href: null, route: null, statusText: 'to do' });
    expect(buildCertGroups({})).toEqual([]);
    expect(
      buildCertGroups({ categories: [{ name: 'N', items: [{ name: 'a', url: 'https://x.test', image: ref('i'), status: 'active' }] }] })[0].badges[0].image,
    ).toEqual(view('i'));
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
