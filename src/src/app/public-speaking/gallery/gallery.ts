import { Component, afterNextRender, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GALLERIES } from '../data/galleries.data';

@Component({
  selector: 'app-gallery',
  imports: [RouterLink],
  templateUrl: './gallery.html',
})
export class Gallery {
  readonly event = input.required<string>();
  readonly year = input.required<string>();

  protected readonly data = computed<any>(() => GALLERIES[`${this.event()}/${this.year()}`] ?? null);

  protected readonly photos = computed(() => {
    const d = this.data();
    if (!d) return [];
    return (d.photos ?? []).map((p: any) => ({ src: d.assetBaseUrl + d.photoBase + p.image, alt: p.alt }));
  });

  constructor() {
    // Auto-cycling carousel — browser-only, after the carousel is in the DOM.
    afterNextRender(() => {
      const el = document.getElementById('carouselExample');
      const bootstrap = (window as any).bootstrap;
      if (el && bootstrap?.Carousel) {
        new bootstrap.Carousel(el, { interval: 2000, touch: false });
      }
    });
  }
}
