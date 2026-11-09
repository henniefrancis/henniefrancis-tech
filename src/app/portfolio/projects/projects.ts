import { NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ImageRef, imageView } from '../../content/image';

const DIAGRAM: ImageRef = { id: 'fe0cd335fa340b63', w: 1461, h: 1480, widths: [480, 960, 1461] };

@Component({
  selector: 'app-projects',
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: './projects.html',
})
export class Projects {
  protected readonly diagram = imageView(DIAGRAM, '(max-width: 600px) 100vw, 960px');
}
