import { NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BIOGRAPHY } from '../content/generated/biography';
import { PAGES } from '../content/generated/pages';
import { imageViewOf } from '../content/image';

@Component({
  selector: 'app-biography',
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: './biography.html',
  styleUrl: './biography.scss',
})
export class Biography {
  protected readonly page = PAGES['biography'];
  protected readonly bio = BIOGRAPHY;
  // The page layout follows the portrait's natural size, so it is declared at its full width.
  protected readonly portrait = imageViewOf(BIOGRAPHY.portrait, `${BIOGRAPHY.portrait.w}px`);
}
