import { NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PAGES } from '../content/generated/pages';
import { TECH_STACK } from '../content/generated/tech-stack';
import { imageViewOf } from '../content/image';

@Component({
  selector: 'app-tech-stack',
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: './tech-stack.html',
})
export class TechStack {
  protected readonly page = PAGES['tech-stack'];
  protected readonly groups = TECH_STACK.categories.map((group) => ({
    ...group,
    items: group.items.map((item) => ({ ...item, image: imageViewOf(item.image) })),
  }));
}
