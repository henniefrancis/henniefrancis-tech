import { NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ImageView, imageView } from '../content/image';
import { byOrder } from '../shared/by-order';
import raw from './certifications.json';

const STATUS_TEXT: Record<string, string> = { active: 'active', inprogress: 'in progress', todo: 'to do' };

export interface CertBadge {
  name: string;
  status: string;
  statusText: string;
  image: ImageView;
  external: boolean;
  href: string | null;
  route: string | null;
}

export interface CertGroup {
  name: string;
  badges: CertBadge[];
}

export function isExternal(u: string): boolean {
  return /^https?:\/\//i.test(u || '');
}

/** Sorted certification categories and badges, with the link target resolved (external href or internal route). */
export function buildCertGroups(data: any): CertGroup[] {
  return (data.categories ?? [])
    .slice()
    .sort(byOrder)
    .map((c: any) => ({
      name: c.name as string,
      badges: (c.items ?? [])
        .slice()
        .sort(byOrder)
        .map((i: any) => {
          const url = i.url as string | undefined;
          const ext = url !== undefined && isExternal(url);
          return {
            name: i.name as string,
            status: i.status as string,
            statusText: STATUS_TEXT[i.status] ?? i.status,
            image: imageView(i.image),
            external: ext,
            href: ext ? url : null,
            route: url === undefined || ext ? null : url.replace('/pages/', '/').replace(/\.html$/, ''),
          };
        }),
    }));
}

@Component({
  selector: 'app-certifications',
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: './certifications.html',
})
export class Certifications {
  protected readonly groups = buildCertGroups(raw);
}
