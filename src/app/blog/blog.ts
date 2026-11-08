import { NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BLOG } from '../content/generated/blog';
import { PAGES } from '../content/generated/pages';
import { imageViewOf } from '../content/image';

@Component({
  selector: 'app-blog',
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: './blog.html',
})
export class Blog {
  protected readonly page = PAGES['blog'];
  protected readonly blog = BLOG;
  protected readonly links = BLOG.links.map((link) => ({ ...link, image: imageViewOf(link.image) }));
}
