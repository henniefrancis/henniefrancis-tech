import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, NavigationEnd, Router, TitleStrategy } from '@angular/router';
import { imageSrc } from '../content/image';
import home from '../home/home.data.json';
import { CERT_DETAILS } from '../certifications/cert-detail/cert-details.data';
import { EVENTS } from '../public-speaking/data/events.data';
import { GALLERIES } from '../public-speaking/data/galleries.data';
import { DEFAULT_DESCRIPTION, PAGE_DESCRIPTIONS } from './page-descriptions';

export const SITE_URL = 'https://henniefrancis.tech';
export const SITE_NAME = 'Hennie Francis';
/** Share image: the largest variant of the profile photo, served from the site's own image path. */
export const SHARE_IMAGE = `${SITE_URL}${imageSrc(home.profile.image)}`;

/** Route path without query, fragment or trailing slash; the home page stays "/". */
export function normalisePath(url: string): string {
  const path = url.split(/[?#]/)[0].replace(/\/+$/, '');
  return path === '' ? '/' : path;
}

/** Canonical address of a path. No trailing slash, except for the home page. */
export function canonicalUrl(path: string): string {
  return path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`;
}

/** Description for a route path: fixed text for static pages, else derived from the record's own heading or title. */
export function descriptionFor(path: string): string {
  const fixed = PAGE_DESCRIPTIONS[path];
  if (fixed) return fixed;
  const seg = path.split('/').filter(Boolean);
  if (seg[0] === 'public-speaking' && seg.length === 4 && seg[2] === 'photos') {
    const g = GALLERIES[`${seg[1]}/${seg[3]}`];
    if (g) return `Photos of Hennie Francis at ${g.title} ${g.year}.`;
  } else if (seg[0] === 'public-speaking' && seg.length === 3) {
    const e = EVENTS[`${seg[1]}/${seg[2]}`];
    if (e) {
      const where = `${e.title} ${e.year}`;
      return e.heading ? `${e.heading}: Hennie Francis at ${where}.` : `Hennie Francis at ${where}.`;
    }
  } else if (seg[0] === 'certifications' && seg[1] === 'microsoft' && seg.length === 4) {
    const c = CERT_DETAILS[`${seg[2]}/${seg[3]}`];
    if (c) return `${c.title}, earned by Hennie Francis.`;
  }
  return DEFAULT_DESCRIPTION;
}

function leaf(route: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
  return route.firstChild ? leaf(route.firstChild) : route;
}

/** Keeps description, canonical, Open Graph, Twitter and robots tags in step with the current route. */
@Injectable({ providedIn: 'root' })
export class Seo {
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);
  private readonly router = inject(Router);
  private readonly titleStrategy = inject(TitleStrategy);
  private readonly doc = inject(DOCUMENT);
  private started = false;

  /** Start following navigation. Safe to call more than once. */
  start(): void {
    if (this.started) return;
    this.started = true;
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationEnd) {
        const snapshot = this.router.routerState.snapshot;
        const noindex = leaf(snapshot.root).data['noindex'] === true;
        this.update(e.urlAfterRedirects, noindex, this.titleStrategy.buildTitle(snapshot));
      }
    });
  }

  /** The title is passed in because the router sets the document title only after this runs. */
  update(url: string, noindex = false, pageTitle?: string): void {
    const path = normalisePath(url);
    const description = noindex ? DEFAULT_DESCRIPTION : descriptionFor(path);
    const title = pageTitle ?? this.title.getTitle();
    this.meta.updateTag({ name: 'description', content: description });
    this.setTags({
      'og:type': 'website',
      'og:site_name': SITE_NAME,
      'og:title': title,
      'og:description': description,
      'og:image': SHARE_IMAGE,
      'twitter:card': 'summary',
      'twitter:title': title,
      'twitter:description': description,
      'twitter:image': SHARE_IMAGE,
    });
    if (noindex) {
      this.meta.updateTag({ name: 'robots', content: 'noindex' });
      this.setCanonical(null);
      this.meta.removeTag('property="og:url"');
    } else {
      this.meta.removeTag('name="robots"');
      this.setCanonical(canonicalUrl(path));
      this.meta.updateTag({ property: 'og:url', content: canonicalUrl(path) });
    }
  }

  private setTags(tags: Record<string, string>): void {
    for (const [key, content] of Object.entries(tags)) {
      const attr = key.startsWith('og:') ? 'property' : 'name';
      this.meta.updateTag({ [attr]: key, content });
    }
  }

  private setCanonical(href: string | null): void {
    const head = this.doc.head;
    let link = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (href === null) {
      link?.remove();
      return;
    }
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      head.appendChild(link);
    }
    link.setAttribute('href', href);
  }
}
