import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { PAGES } from '../content/generated/pages';
import { RECORDS } from '../content/generated/records';
import { SITE } from '../content/generated/site';
import { DEFAULT_DESCRIPTION, SITE_NAME, Seo, SHARE_IMAGE, SITE_URL, canonicalUrl, descriptionFor, normalisePath } from './seo';

@Component({ selector: 'app-stub', template: '' })
class Stub {}

const tag = (sel: string) => document.head.querySelector(sel)?.getAttribute('content');
const canonical = () => document.head.querySelector('link[rel="canonical"]')?.getAttribute('href');
const DASHES = /[–—]/;

describe('seo helpers', () => {
  it('normalises paths', () => {
    expect(normalisePath('/')).toBe('/');
    expect(normalisePath('')).toBe('/');
    expect(normalisePath('/blog/')).toBe('/blog');
    expect(normalisePath('/blog?x=1#top')).toBe('/blog');
    expect(normalisePath('/a//')).toBe('/a');
  });

  it('builds canonical urls without a trailing slash except for home', () => {
    expect(canonicalUrl('/')).toBe(`${SITE_URL}/`);
    expect(canonicalUrl('/blog')).toBe(`${SITE_URL}/blog`);
  });

  it('takes the site name from the content', () => {
    expect(SITE_NAME).toBe(SITE.name);
  });

  it('has a plain-text description for every static page that defines one, none using dashes', () => {
    const described = Object.values(PAGES).filter((p) => p.description);
    expect(described.length).toBeGreaterThan(0);
    for (const page of described) {
      expect(descriptionFor(page.route)).toBe(page.description);
      expect(DASHES.test(page.description!)).toBe(false);
    }
  });

  it('derives descriptions for events, galleries and certificates from their record summaries', () => {
    expect(descriptionFor('/public-speaking/conf-one/2025')).toBe(`A talk title: ${SITE.name} at Conference One 2025.`);
    expect(descriptionFor('/public-speaking/conf-two/2024')).toBe(`${SITE.name} at Conference Two 2024.`);
    expect(descriptionFor('/public-speaking/conf-one/photos/2025')).toBe(`Photos of ${SITE.name} at Conference One 2025.`);
    const cert = Object.entries(RECORDS).find(([, r]) => r.kind === 'certificate')!;
    expect(descriptionFor(cert[0])).toBe(`${(cert[1] as { title: string }).title}, earned by ${SITE.name}.`);
  });

  it('falls back to the home description for unknown records and paths', () => {
    expect(DEFAULT_DESCRIPTION).toBe(PAGES['home'].description);
    expect(descriptionFor('/public-speaking/nope/1999')).toBe(DEFAULT_DESCRIPTION);
    expect(descriptionFor('/public-speaking/nope/photos/1999')).toBe(DEFAULT_DESCRIPTION);
    expect(descriptionFor('/certifications/microsoft/x/y')).toBe(DEFAULT_DESCRIPTION);
    expect(descriptionFor('/something-else')).toBe(DEFAULT_DESCRIPTION);
  });
});

describe('Seo service', () => {
  let seo: Seo;

  beforeEach(() => {
    document.head
      .querySelectorAll('meta[name], meta[property], link[rel="canonical"]')
      .forEach((n) => n.remove());
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', component: Stub, title: 'Home' },
          { path: 'blog', component: Stub, title: 'Blog' },
          { path: 'gone', component: Stub, title: 'Missing', data: { noindex: true } },
          { path: 'shortcut', redirectTo: 'blog' },
        ]),
      ],
    });
    seo = TestBed.inject(Seo);
  });

  it('sets description, canonical, Open Graph and Twitter tags for a page', () => {
    TestBed.inject(Title).setTitle('Blog');
    seo.update('/blog/');
    expect(tag('meta[name="description"]')).toBe(PAGES['blog'].description);
    expect(canonical()).toBe(`${SITE_URL}/blog`);
    expect(tag('meta[property="og:url"]')).toBe(`${SITE_URL}/blog`);
    expect(tag('meta[property="og:title"]')).toBe('Blog');
    expect(tag('meta[property="og:type"]')).toBe('website');
    expect(tag('meta[property="og:image"]')).toBe(SHARE_IMAGE);
    expect(tag('meta[name="twitter:card"]')).toBe('summary');
    expect(tag('meta[name="twitter:title"]')).toBe('Blog');
    expect(tag('meta[name="twitter:description"]')).toBe(PAGES['blog'].description);
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });

  it('updates the same tags instead of duplicating them', () => {
    seo.update('/blog');
    seo.update('/');
    expect(document.head.querySelectorAll('link[rel="canonical"]').length).toBe(1);
    expect(document.head.querySelectorAll('meta[name="description"]').length).toBe(1);
    expect(canonical()).toBe(`${SITE_URL}/`);
  });

  it('marks a noindex page: robots meta, no canonical, no og:url', () => {
    seo.update('/blog');
    seo.update('/whatever', true);
    expect(tag('meta[name="robots"]')).toBe('noindex');
    expect(canonical()).toBeUndefined();
    expect(document.head.querySelector('meta[property="og:url"]')).toBeNull();
    expect(tag('meta[name="description"]')).toBe(PAGES['home'].description);
    seo.update('/blog');
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });

  it('removing a canonical that is absent is harmless', () => {
    expect(() => seo.update('/x', true)).not.toThrow();
  });

  it('follows navigation, uses the final url after a redirect and starts only once', async () => {
    const router = TestBed.inject(Router);
    const spy = vi.spyOn(seo, 'update');
    seo.start();
    seo.start();
    await router.navigateByUrl('/shortcut');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('/blog', false, 'Blog');
    expect(canonical()).toBe(`${SITE_URL}/blog`);
    await router.navigateByUrl('/gone');
    expect(spy).toHaveBeenLastCalledWith('/gone', true, 'Missing');
    expect(tag('meta[name="robots"]')).toBe('noindex');
    expect(tag('meta[property="og:title"]')).toBe('Missing');
  });

  it('falls back to the current document title when the route has none', () => {
    TestBed.inject(Title).setTitle('Fallback');
    seo.update('/blog');
    expect(tag('meta[property="og:title"]')).toBe('Fallback');
  });
});
