import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, NavigationEnd, Router, TitleStrategy } from '@angular/router';
import { PAGES } from '../content/generated/pages';
import { RECORDS } from '../content/generated/records';
import { HOME } from '../content/generated/home';
import { SITE } from '../content/generated/site';
import { imageSrc } from '../content/image';

export const SITE_URL = 'https://henniefrancis.tech';
export const SITE_NAME = SITE.name;

/** Meta descriptions come from the page content (config); the home page text is the fallback. */
const PAGE_DESCRIPTIONS: Record<string, string | undefined> = Object.fromEntries(Object.values(PAGES).map((p) => [p.route, p.description]));
// The home page must have a description (the schema requires it), so it is the fallback for every page.
export const DEFAULT_DESCRIPTION = PAGES.home.description!;
/** Share image: the largest variant of the profile photo, served from the site's own image path. */
export const SHARE_IMAGE = `${SITE_URL}${imageSrc(HOME.profile)}`;

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
  const record = RECORDS[path];
  if (record?.kind === 'gallery') return `Photos of ${SITE_NAME} at ${record.title} ${record.year}.`;
  if (record?.kind === 'event') {
    const where = `${record.title} ${record.year}`;
    return record.heading ? `${record.heading}: ${SITE_NAME} at ${where}.` : `${SITE_NAME} at ${where}.`;
  }
  if (record?.kind === 'certificate') return `${record.title}, earned by ${SITE_NAME}.`;
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
