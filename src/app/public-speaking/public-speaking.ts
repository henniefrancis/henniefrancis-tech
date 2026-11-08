import { NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PAGES } from '../content/generated/pages';
import { SPEAKING_INDEX } from '../content/generated/speaking';
import { imageViewOf } from '../content/image';

const TILE_SIZES = '(max-width: 499px) 100vw, (max-width: 699px) 50vw, 34vw';

@Component({
  selector: 'app-public-speaking',
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: './public-speaking.html',
})
export class PublicSpeaking {
  protected readonly page = PAGES['public-speaking'];
  protected readonly years = SPEAKING_INDEX.map((year) => ({
    ...year,
    talks: year.talks.map((talk) => ({ ...talk, image: imageViewOf(talk.image, TILE_SIZES) })),
  }));
}
