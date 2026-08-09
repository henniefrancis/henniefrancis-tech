import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import raw from './tech-stack.json';

const data = raw as any;
const base: string = data.imageBaseUrl ?? '';

@Component({
  selector: 'app-tech-stack',
  imports: [RouterLink],
  templateUrl: './tech-stack.html',
})
export class TechStack {
  protected readonly groups = (data.categories ?? [])
    .slice()
    .sort((a: any, b: any) => (a.order ?? 999) - (b.order ?? 999))
    .map((c: any) => ({
      name: c.name as string,
      tools: (c.items ?? [])
        .slice()
        .sort((a: any, b: any) => (a.order ?? 999) - (b.order ?? 999))
        .map((i: any) => ({ name: i.name as string, url: i.url as string, src: base + i.image })),
    }));
}
