import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PAGES } from '../../content/generated/pages';

@Component({
  selector: 'app-career-history',
  imports: [RouterLink],
  templateUrl: './career-history.html',
})
export class CareerHistory {
  protected readonly pages = PAGES;
}
