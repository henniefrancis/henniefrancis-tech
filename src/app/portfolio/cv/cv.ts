import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PAGES } from '../../content/generated/pages';

@Component({
  selector: 'app-cv',
  imports: [RouterLink],
  templateUrl: './cv.html',
})
export class Cv {
  protected readonly pages = PAGES;
}
