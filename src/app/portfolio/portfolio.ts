import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PAGES } from '../content/generated/pages';
import { PORTFOLIO } from '../content/generated/portfolio';

@Component({
  selector: 'app-portfolio',
  imports: [RouterLink],
  templateUrl: './portfolio.html',
})
export class Portfolio {
  protected readonly page = PAGES['portfolio'];
  protected readonly tiles = PORTFOLIO.tiles;
}
