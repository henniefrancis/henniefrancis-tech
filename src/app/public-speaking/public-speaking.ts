import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { byOrder } from '../shared/by-order';
import raw from './public-speaking.json';

export interface YearGroup {
  name: string;
  talks: { name: string; route: string; src: string }[];
}

// "../pages/public-speaking/aws-summit/2024.html" -> "/public-speaking/aws-summit/2024"
export function toRoute(url: string): string {
  return url.replace('../pages/', '/').replace(/\.html$/, '');
}

/** Sorted years and talks with their route and full image URL. */
export function buildYears(data: any): YearGroup[] {
  const base: string = data.imageBaseUrl ?? '';
  return (data.categories ?? [])
    .slice()
    .sort(byOrder)
    .map((c: any) => ({
      name: c.name as string,
      talks: (c.items ?? [])
        .slice()
        .sort(byOrder)
        .map((i: any) => ({ name: i.name as string, route: toRoute(i.url as string), src: base + i.image })),
    }));
}

@Component({
  selector: 'app-public-speaking',
  imports: [RouterLink],
  templateUrl: './public-speaking.html',
})
export class PublicSpeaking {
  protected readonly years = buildYears(raw);
}
