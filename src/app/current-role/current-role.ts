import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import raw from './current-role.json';

const RESERVED = new Set(['version', 'imageBaseUrl', 'images']);

export interface RoleLogo {
  href: string;
  className: string;
  name: string;
  src: string;
}

export function buildLogo(data: any): RoleLogo | null {
  const base: string = data.imageBaseUrl ?? '';
  const logoRaw = (data.images ?? [])[0];
  return logoRaw
    ? {
        href: logoRaw.url as string,
        className: (logoRaw.className as string) ?? '',
        name: (logoRaw.name as string) ?? '',
        src: base + logoRaw.image,
      }
    : null;
}

/** Fact rows: the flat top-level key/value pairs, in file order, non-empty only. */
export function buildFacts(data: Record<string, unknown>): { label: string; value: string }[] {
  return Object.entries(data)
    .filter(([k, v]) => !RESERVED.has(k) && typeof v === 'string' && (v as string).trim() !== '')
    .map(([label, value]) => ({ label, value: value as string }));
}

@Component({
  selector: 'app-current-role',
  imports: [RouterLink],
  templateUrl: './current-role.html',
})
export class CurrentRole {
  protected readonly logo = buildLogo(raw);
  protected readonly facts = buildFacts(raw as Record<string, unknown>);
}
