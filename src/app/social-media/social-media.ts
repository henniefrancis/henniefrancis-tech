import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { imageSrc } from '../content/image';
import { byOrder } from '../shared/by-order';
import raw from './social.json';

export interface Social {
  name: string;
  /** Absent for an entry that is shown as an image only (no link). */
  url?: string;
  src: string;
}

/** Sorted social-media items with their full image URL. */
export function buildSocials(data: any): Social[] {
  return (data.items ?? [])
    .slice()
    .sort(byOrder)
    .map((i: any) => ({ name: i.name as string, url: i.url as string | undefined, src: imageSrc(i.image) }));
}

@Component({
  selector: 'app-social-media',
  imports: [RouterLink],
  templateUrl: './social-media.html',
})
export class SocialMedia {
  protected readonly socials = buildSocials(raw);
}
