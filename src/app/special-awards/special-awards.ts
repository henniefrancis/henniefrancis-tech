import { NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PAGES } from '../content/generated/pages';
import { SPECIAL_AWARDS } from '../content/generated/special-awards';
import { imageViewOf } from '../content/image';

@Component({
  selector: 'app-special-awards',
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: './special-awards.html',
})
export class SpecialAwards {
  protected readonly page = PAGES['special-awards'];
  protected readonly slides = SPECIAL_AWARDS.slides.map((slide) => ({
    image: imageViewOf(slide, '(max-width: 600px) 420px, 750px'),
  }));
}
