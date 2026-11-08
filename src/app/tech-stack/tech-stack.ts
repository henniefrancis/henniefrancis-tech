import { NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ImageView, imageView } from '../content/image';
import { byOrder } from '../shared/by-order';
import raw from './tech-stack.json';

export interface TechGroup {
  name: string;
  tools: { name: string; url: string; image: ImageView }[];
}

/** Sorted tech-stack categories and tools with their full image URL. */
export function buildTechGroups(data: any): TechGroup[] {
  return (data.categories ?? [])
    .slice()
    .sort(byOrder)
    .map((c: any) => ({
      name: c.name as string,
      tools: (c.items ?? [])
        .slice()
        .sort(byOrder)
        .map((i: any) => ({ name: i.name as string, url: i.url as string, image: imageView(i.image) })),
    }));
}

@Component({
  selector: 'app-tech-stack',
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: './tech-stack.html',
})
export class TechStack {
  protected readonly groups = buildTechGroups(raw);
}
