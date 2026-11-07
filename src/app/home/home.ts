import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HOME } from '../content/generated/home';
import { PAGES } from '../content/generated/pages';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  protected readonly page = PAGES['home'];
  protected readonly home = HOME;
}
