import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import raw from './certifications.json';

const data = raw as any;
const base: string = data.imageBaseUrl ?? '';
const STATUS_TEXT: Record<string, string> = { active: 'active', inprogress: 'in progress', todo: 'to do' };

function isExternal(u: string): boolean {
  return /^https?:\/\//i.test(u || '');
}

@Component({
  selector: 'app-certifications',
  imports: [RouterLink],
  templateUrl: './certifications.html',
})
export class Certifications {
  protected readonly groups = (data.categories ?? [])
    .slice()
    .sort((a: any, b: any) => (a.order ?? 999) - (b.order ?? 999))
    .map((c: any) => ({
      name: c.name as string,
      badges: (c.items ?? [])
        .slice()
        .sort((a: any, b: any) => (a.order ?? 999) - (b.order ?? 999))
        .map((i: any) => {
          const ext = isExternal(i.url as string);
          return {
            name: i.name as string,
            status: i.status as string,
            statusText: STATUS_TEXT[i.status] ?? i.status,
            src: base + i.image,
            external: ext,
            href: ext ? (i.url as string) : null,
            route: ext ? null : (i.url as string).replace('/pages/', '/').replace(/\.html$/, ''),
          };
        }),
    }));
}
