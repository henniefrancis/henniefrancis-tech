import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PAGES } from '../content/generated/pages';
import { SOCIAL } from '../content/generated/social';

@Component({
  selector: 'app-social-media',
  imports: [RouterLink],
  templateUrl: './social-media.html',
})
export class SocialMedia {
  protected readonly page = PAGES['social-media'];
  /** All links in config order. Categories are content structure; the grid shows them as one list for now. */
  protected readonly socials = SOCIAL.categories.flatMap((category) => category.items);
}
