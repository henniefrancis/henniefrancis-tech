import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EVENTS } from '../data/events.data';

@Component({
  selector: 'app-event-detail',
  imports: [RouterLink],
  templateUrl: './event-detail.html',
})
export class EventDetail {
  // Bound from the route params via withComponentInputBinding().
  readonly event = input.required<string>();
  readonly year = input.required<string>();

  protected readonly data = computed<any>(() => EVENTS[`${this.event()}/${this.year()}`] ?? null);

  protected readonly links = computed(() => {
    const d = this.data();
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
          route: isPhotos ? `/public-speaking/${this.event()}/photos/${photoYear}` : null,
          src: d.assetBaseUrl + l.image,
        };
      });
  });
}
