import { NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ImageView, imageView } from '../content/image';
import { byOrder } from '../shared/by-order';
import raw from './public-speaking.json';

export interface YearGroup {
  name: string;
  talks: { name: string; route: string; image: ImageView }[];
}

// "../pages/public-speaking/aws-summit/2024.html" -> "/public-speaking/aws-summit/2024"
export function toRoute(url: string): string {
  return url.replace('../pages/', '/').replace(/\.html$/, '');
}

/** Tiles sit in a column that is a third (a half on small screens, the full width on phones) of the page. */
const TILE_SIZES = '(max-width: 499px) 100vw, (max-width: 699px) 50vw, 34vw';

/** Sorted years and talks with their route and full image URL. */
export function buildYears(data: any): YearGroup[] {
  return (data.categories ?? [])
    .slice()
    .sort(byOrder)
    .map((c: any) => ({
      name: c.name as string,
      talks: (c.items ?? [])
        .slice()
        .sort(byOrder)
        .map((i: any) => ({ name: i.name as string, route: toRoute(i.url as string), image: imageView(i.image, TILE_SIZES) })),
    }));
}

@Component({
  selector: 'app-public-speaking',
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: './public-speaking.html',
})
export class PublicSpeaking {
  protected readonly years = buildYears(raw);
}
