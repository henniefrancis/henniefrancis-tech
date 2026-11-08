import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ImageRef, imageSrc } from '../content/image';

const CV: ImageRef = { id: '06646710e076bb28', w: 898, h: 440, widths: [449, 898] };
const HISTORY: ImageRef = { id: '09b393de76e0880a', w: 898, h: 485, widths: [449, 898] };
const PROJECTS: ImageRef = { id: '21cfb5bc43824030', w: 898, h: 426, widths: [449, 898] };

@Component({
  selector: 'app-portfolio',
  imports: [RouterLink],
  templateUrl: './portfolio.html',
})
export class Portfolio {
  protected readonly tiles = [
    { name: 'Curriculum Vitae', route: '/portfolio/cv', src: imageSrc(CV) },
    { name: 'Career History', route: '/portfolio/career-history', src: imageSrc(HISTORY) },
    { name: 'Projects', route: '/portfolio/projects', src: imageSrc(PROJECTS) },
  ];
}
