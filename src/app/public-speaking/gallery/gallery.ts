import { NgOptimizedImage } from '@angular/common';
import { Component, afterNextRender, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ImageView, imageView } from '../../content/image';
import { GALLERIES } from '../data/galleries.data';

export interface Photo {
  image: ImageView;
  alt: string;
}

export function buildPhotos(d: any): Photo[] {
  if (!d) return [];
  return (d.photos ?? []).map((p: any) => ({ image: imageView(p.image, '(max-width: 600px) 420px, 750px'), alt: p.alt }));
}

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

  protected readonly data = computed<any>(() => GALLERIES[`${this.event()}/${this.year()}`] ?? null);

  protected readonly photos = computed(() => buildPhotos(this.data()));

  constructor() {
    // Auto-cycling carousel, browser-only, after the carousel is in the DOM.
    afterNextRender(() => startCarousel(document, window));
  }
}
