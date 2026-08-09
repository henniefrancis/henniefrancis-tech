import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import raw from './public-speaking.json';

const data = raw as any;
const base: string = data.imageBaseUrl ?? '';

// "../pages/public-speaking/aws-summit/2024.html" -> "/public-speaking/aws-summit/2024"
function toRoute(url: string): string {
  return url.replace('../pages/', '/').replace(/\.html$/, '');
}

@Component({
  selector: 'app-public-speaking',
  imports: [RouterLink],
  templateUrl: './public-speaking.html',
})
export class PublicSpeaking {
  protected readonly years = (data.categories ?? [])
    .slice()
    .sort((a: any, b: any) => (a.order ?? 999) - (b.order ?? 999))
    .map((c: any) => ({
      name: c.name as string,
      talks: (c.items ?? [])
        .slice()
        .sort((a: any, b: any) => (a.order ?? 999) - (b.order ?? 999))
        .map((i: any) => ({ name: i.name as string, route: toRoute(i.url as string), src: base + i.image })),
    }));
}
