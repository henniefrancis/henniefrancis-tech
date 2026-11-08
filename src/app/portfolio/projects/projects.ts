import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ImageRef, imageSrc } from '../../content/image';

const DIAGRAM: ImageRef = { id: 'fe0cd335fa340b63', w: 1461, h: 1480, widths: [480, 960, 1461] };

@Component({
  selector: 'app-projects',
  imports: [RouterLink],
  templateUrl: './projects.html',
})
export class Projects {
  protected readonly diagram = imageSrc(DIAGRAM);
}
