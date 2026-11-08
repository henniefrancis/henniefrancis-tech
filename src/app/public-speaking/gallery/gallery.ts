import { NgOptimizedImage } from '@angular/common';
import { Component, afterNextRender, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { GalleryContent } from '../../content/content.types';
import { PAGES } from '../../content/generated/pages';
import { GALLERIES } from '../../content/generated/speaking';
import { imageViewOf } from '../../content/image';

/** Starts the Bootstrap carousel when the page has one and Bootstrap is loaded. */
export function startCarousel(doc: Document, win: any): void {
  const el = doc.getElementById('carouselExample');
  const bootstrap = win.bootstrap;
  if (el && bootstrap?.Carousel) {
    new bootstrap.Carousel(el, { interval: 2000, touch: false });
  }
}

@Component({
  selector: 'app-gallery',
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: './gallery.html',
})
export class Gallery {
  readonly event = input.required<string>();
  readonly year = input.required<string>();

  protected readonly pages = PAGES;
  protected readonly data = computed<GalleryContent | null>(() => GALLERIES[`${this.event()}/${this.year()}`] ?? null);
  protected readonly photos = computed(() =>
    (this.data()?.photos ?? []).map((photo) => ({ image: imageViewOf(photo, '(max-width: 600px) 420px, 750px') })),
  );

  constructor() {
    // Auto-cycling carousel, browser-only, after the carousel is in the DOM.
    afterNextRender(() => startCarousel(document, window));
  }
}
