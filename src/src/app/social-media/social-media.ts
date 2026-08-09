import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import raw from './social.json';

const data = raw as any;
const base: string = data.imageBaseUrl ?? '';

@Component({
  selector: 'app-social-media',
  imports: [RouterLink],
  templateUrl: './social-media.html',
})
export class SocialMedia {
  protected readonly socials = (data.items ?? [])
    .slice()
    .sort((a: any, b: any) => (a.order ?? 999) - (b.order ?? 999))
    .map((i: any) => ({ name: i.name as string, url: i.url as string, src: base + i.image }));
}
