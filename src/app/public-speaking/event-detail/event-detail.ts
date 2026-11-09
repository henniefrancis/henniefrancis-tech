import { NgOptimizedImage } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ImageView, imageView } from '../../content/image';
import { EVENTS } from '../data/events.data';

export interface EventLink {
  title: string;
  alt: string;
  label: string | null;
  external: boolean;
  href: string | null;
  route: string | null;
  image: ImageView;
}

/** Visible links of an event record: external links keep their href, photos links become gallery routes. */
export function buildEventLinks(d: any, event: string): EventLink[] {
  if (!d) return [];
  return (d.links ?? [])
    .filter((l: any) => l && l.enabled !== false && l.url)
    .map((l: any) => {
      const external = /^https?:\/\//i.test(l.url);
      const isPhotos = /^photos\//.test(l.url);
      const photoYear = isPhotos ? l.url.replace('photos/', '').replace(/\.html$/, '') : '';
      return {
        title: l.title,
        alt: l.alt || l.title,
        label: l.label ?? null,
        external,
        href: external ? l.url : null,
        route: isPhotos ? `/public-speaking/${event}/photos/${photoYear}` : null,
        image: imageView(l.image),
      };
    });
}

@Component({
  selector: 'app-event-detail',
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: './event-detail.html',
})
export class EventDetail {
  // Bound from the route params via withComponentInputBinding().
  protected readonly imageView = imageView;

  readonly event = input.required<string>();
  readonly year = input.required<string>();

  protected readonly data = computed<any>(() => EVENTS[`${this.event()}/${this.year()}`] ?? null);

  protected readonly links = computed(() => buildEventLinks(this.data(), this.event()));
}
