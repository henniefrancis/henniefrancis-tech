import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { imageSrc } from '../content/image';
import data from './home.data.json';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  protected readonly imageSrc = imageSrc;

  /** Profile photo and dashboard tiles (routes are the clean Angular paths). */
  protected readonly profile = data.profile;
  protected readonly tiles = data.tiles;
}
