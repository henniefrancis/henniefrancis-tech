import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ImageRef, imageSrc } from '../content/image';

const COMMUNITY_BUILDER: ImageRef = { id: '5dab526682275256', w: 800, h: 419, widths: [480, 800] };
const ROCKSTAR: ImageRef = { id: '0a7cdad1c23f3243', w: 980, h: 850, widths: [480, 960, 980] };

@Component({
  selector: 'app-special-awards',
  imports: [RouterLink],
  templateUrl: './special-awards.html',
})
export class SpecialAwards {
  protected readonly slides = [
    { src: imageSrc(COMMUNITY_BUILDER), alt: 'AWS Community Builder' },
    { src: imageSrc(ROCKSTAR), alt: 'Rockstar' },
  ];
}
