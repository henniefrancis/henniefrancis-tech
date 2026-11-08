import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { IMAGE_LOADER_PROVIDER } from './content/image';
import { SocialMedia } from './social-media/social-media';
import { TechStack } from './tech-stack/tech-stack';
import { PublicSpeaking } from './public-speaking/public-speaking';
import { Certifications, buildCertGroups } from './certifications/certifications';
import { CurrentRole } from './current-role/current-role';
import { CERT_CATEGORIES } from './content/generated/certifications';
import { CURRENT_ROLE } from './content/generated/current-role';
import { PAGES } from './content/generated/pages';
import { SOCIAL } from './content/generated/social';
import { SPEAKING_INDEX } from './content/generated/speaking';
import { TECH_STACK } from './content/generated/tech-stack';

// These specs run against the synthetic fixture content (npm run content:fixtures).
async function render(component: Type<unknown>): Promise<HTMLElement> {
  TestBed.configureTestingModule({ imports: [component], providers: [provideRouter([]), IMAGE_LOADER_PROVIDER] });
  const fixture = TestBed.createComponent(component);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

const text = (el: Element | null) => el?.textContent?.trim();

describe('SocialMedia', () => {
  it('renders every item of every category in order; an item without a url is an image only', async () => {
    const el = await render(SocialMedia);
    const items = SOCIAL.categories.flatMap((c) => c.items);
    expect(text(el.querySelector('h1'))).toBe(PAGES['social-media'].heading);
    const imgs = Array.from(el.querySelectorAll('.socials img'));
    expect(imgs.map((i) => i.getAttribute('alt'))).toEqual(items.map((i) => i.image.alt));
    const links = Array.from(el.querySelectorAll('.socials a'));
    expect(links.map((a) => a.getAttribute('href'))).toEqual(items.filter((i) => i.url).map((i) => i.url));
    expect(links.every((a) => a.getAttribute('rel') === 'noopener noreferrer')).toBe(true);
    expect(el.querySelectorAll('.socials').length).toBe(items.length);
    expect(items.some((i) => !i.url)).toBe(true);
  });
});

describe('TechStack', () => {
  it('renders a heading and linked tools per group', async () => {
    const el = await render(TechStack);
    expect(Array.from(el.querySelectorAll('h4')).map((h) => h.textContent)).toEqual(TECH_STACK.categories.map((c) => c.name));
    const tools = TECH_STACK.categories.flatMap((c) => c.items);
    expect(Array.from(el.querySelectorAll('img.techstack')).map((i) => i.getAttribute('alt'))).toEqual(tools.map((t) => t.image.alt));
    expect(Array.from(el.querySelectorAll('a[target="_blank"]')).map((a) => a.getAttribute('href'))).toEqual(tools.map((t) => t.url));
  });
  it('puts a rule between groups only', async () => {
    const el = await render(TechStack);
    expect(el.querySelectorAll('.container-fluid-content hr').length).toBe(TECH_STACK.categories.length - 1);
  });
});

describe('PublicSpeaking', () => {
  it('renders the year groups and the talk tiles with their routes', async () => {
    const el = await render(PublicSpeaking);
    expect(Array.from(el.querySelectorAll('h4')).map((h) => h.textContent)).toEqual(SPEAKING_INDEX.map((y) => y.name));
    const talks = SPEAKING_INDEX.flatMap((y) => y.talks);
    expect(Array.from(el.querySelectorAll('.publicspeaking a')).map((a) => a.getAttribute('href'))).toEqual(talks.map((t) => t.route));
    expect(Array.from(el.querySelectorAll('.publicspeaking img')).map((i) => i.getAttribute('alt'))).toEqual(talks.map((t) => t.image.alt));
  });
});

describe('Certifications', () => {
  it('renders badges per category with a link by kind and a status label', async () => {
    const el = await render(Certifications);
    expect(Array.from(el.querySelectorAll('h4')).map((h) => h.textContent)).toEqual(CERT_CATEGORIES.map((c) => c.name));
    const badges = CERT_CATEGORIES.flatMap((c) => c.badges);
    const linked = badges.filter((b) => b.href ?? b.route);
    const links = Array.from(el.querySelectorAll('.certification a[href]'));
    expect(links.map((a) => a.getAttribute('title'))).toEqual(linked.map((b) => b.name));
    expect(links.map((a) => a.getAttribute('href'))).toEqual(linked.map((b) => b.href ?? b.route));
    expect(links.filter((a) => a.getAttribute('target') === '_blank').length).toBe(badges.filter((b) => b.href).length);
  });

  it('shows a badge without a link as an image and a label only', async () => {
    const el = await render(Certifications);
    const plain = CERT_CATEGORIES.flatMap((c) => c.badges).filter((b) => !b.href && !b.route);
    expect(plain.length).toBeGreaterThan(0);
    const anchors = Array.from(el.querySelectorAll('.certification a:not([href])'));
    expect(anchors.length).toBe(plain.length);
    expect(anchors.map((a) => a.querySelector('img')?.getAttribute('alt'))).toEqual(plain.map((b) => b.image.alt));
    expect(anchors.every((a) => a.querySelector('img') && a.querySelector('label'))).toBe(true);
  });

  it('shows the label text for every status, including expired and retired', async () => {
    const el = await render(Certifications);
    const labels = new Map(Array.from(el.querySelectorAll('.certification label')).map((l) => [l.className, l.textContent]));
    expect(labels.get('active')).toBe('active');
    expect(labels.get('inprogress')).toBe('in progress');
    expect(labels.get('todo')).toBe('to do');
    expect(labels.get('expired')).toBe('expired');
    expect(labels.get('retired')).toBe('retired');
  });

  it('buildCertGroups adds the label text and keeps the order', () => {
    const groups = buildCertGroups(CERT_CATEGORIES);
    expect(groups.map((g) => g.name)).toEqual(CERT_CATEGORIES.map((c) => c.name));
    expect(groups[0].badges[0].statusText).toBe('active');
  });
});

describe('CurrentRole', () => {
  it('renders the logo and facts when the page is enabled', async () => {
    const el = await render(CurrentRole);
    expect(text(el.querySelector('h1'))).toBe(PAGES['current-role'].heading);
    expect(el.querySelector('img.current-role')?.getAttribute('src')).toBe(CURRENT_ROLE.logo!.image.src);
    expect(el.querySelector('a[target="_blank"]')?.getAttribute('href')).toBe(CURRENT_ROLE.logo!.url);
    expect(Array.from(el.querySelectorAll('h5')).map((h) => h.textContent)).toEqual(CURRENT_ROLE.facts.map((f) => `${f.label}:`));
  });

  it('shows only the heading when the page is disabled, and no logo when there is none', async () => {
    const original = { enabled: CURRENT_ROLE.enabled, logo: CURRENT_ROLE.logo };
    try {
      CURRENT_ROLE.enabled = false;
      let el = await render(CurrentRole);
      expect(el.querySelector('h5')).toBeNull();
      expect(el.querySelector('img')).toBeNull();
      TestBed.resetTestingModule();
      CURRENT_ROLE.enabled = true;
      CURRENT_ROLE.logo = undefined;
      el = await render(CurrentRole);
      expect(el.querySelector('img')).toBeNull();
      expect(el.querySelectorAll('h5').length).toBe(CURRENT_ROLE.facts.length);
    } finally {
      CURRENT_ROLE.enabled = original.enabled;
      CURRENT_ROLE.logo = original.logo;
    }
  });
});
