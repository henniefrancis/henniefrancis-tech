import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import raw from './current-role.json';

const data = raw as any;
const base: string = data.imageBaseUrl ?? '';
const RESERVED = new Set(['version', 'imageBaseUrl', 'images']);
const logoRaw = (data.images ?? [])[0];

@Component({
  selector: 'app-current-role',
  imports: [RouterLink],
  templateUrl: './current-role.html',
})
export class CurrentRole {
  protected readonly logo = logoRaw
    ? {
        href: logoRaw.url as string,
        className: (logoRaw.className as string) ?? '',
        name: (logoRaw.name as string) ?? '',
        src: base + logoRaw.image,
      }
    : null;

  // Fact rows: the flat top-level key/value pairs, in file order, non-empty only.
  protected readonly facts = Object.entries(data as Record<string, unknown>)
    .filter(([k, v]) => !RESERVED.has(k) && typeof v === 'string' && (v as string).trim() !== '')
    .map(([label, value]) => ({ label, value: value as string }));
}
