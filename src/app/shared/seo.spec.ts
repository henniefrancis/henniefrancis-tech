import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { EVENTS } from '../public-speaking/data/events.data';
import { GALLERIES } from '../public-speaking/data/galleries.data';
import { CERT_DETAILS } from '../certifications/cert-detail/cert-details.data';
import { PAGE_DESCRIPTIONS } from './page-descriptions';
import { Seo, SHARE_IMAGE, SITE_URL, canonicalUrl, descriptionFor, normalisePath } from './seo';

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

  it('has a plain-text description for every static page, none using dashes', () => {
    for (const [path, text] of Object.entries(PAGE_DESCRIPTIONS)) {
      expect(descriptionFor(path)).toBe(text);
      expect(DASHES.test(text)).toBe(false);
      expect(text.length).toBeLessThanOrEqual(200);
    }
  });

  it('derives descriptions for events, galleries and certificates from their records', () => {
    const [eKey, e] = Object.entries(EVENTS)[0];
    expect(descriptionFor(`/public-speaking/${eKey}`)).toContain(`${e.title} ${e.year}`);
    const [gKey, g] = Object.entries(GALLERIES)[0];
    const [ge, gy] = gKey.split('/');
    expect(descriptionFor(`/public-speaking/${ge}/photos/${gy}`)).toBe(
      `Photos of Hennie Francis at ${g.title} ${g.year}.`,
    );
    const [cKey, c] = Object.entries(CERT_DETAILS)[0];
    expect(descriptionFor(`/certifications/microsoft/${cKey}`)).toBe(`${c.title}, earned by Hennie Francis.`);
  });

  it('uses the heading when an event has one and falls back when it does not', () => {
    const key = 'aws-reinvent-recap/2025';
    const original = EVENTS[key];
    try {
      EVENTS[key] = { title: 'T', year: '1', heading: 'H' };
      expect(descriptionFor(`/public-speaking/${key}`)).toBe('H: Hennie Francis at T 1.');
      EVENTS[key] = { title: 'T', year: '1' };
      expect(descriptionFor(`/public-speaking/${key}`)).toBe('Hennie Francis at T 1.');
    } finally {
      EVENTS[key] = original;
    }
  });

  it('falls back to the home description for unknown records and paths', () => {
    const home = PAGE_DESCRIPTIONS['/'];
    expect(descriptionFor('/public-speaking/nope/1999')).toBe(home);
    expect(descriptionFor('/public-speaking/nope/photos/1999')).toBe(home);
    expect(descriptionFor('/certifications/microsoft/x/y')).toBe(home);
    expect(descriptionFor('/something-else')).toBe(home);
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
    expect(tag('meta[name="description"]')).toBe(PAGE_DESCRIPTIONS['/blog']);
    expect(canonical()).toBe(`${SITE_URL}/blog`);
    expect(tag('meta[property="og:url"]')).toBe(`${SITE_URL}/blog`);
    expect(tag('meta[property="og:title"]')).toBe('Blog');
    expect(tag('meta[property="og:type"]')).toBe('website');
    expect(tag('meta[property="og:image"]')).toBe(SHARE_IMAGE);
    expect(tag('meta[name="twitter:card"]')).toBe('summary');
    expect(tag('meta[name="twitter:title"]')).toBe('Blog');
    expect(tag('meta[name="twitter:description"]')).toBe(PAGE_DESCRIPTIONS['/blog']);
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
    expect(tag('meta[name="description"]')).toBe(PAGE_DESCRIPTIONS['/']);
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
