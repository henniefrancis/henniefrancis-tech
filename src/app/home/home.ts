import { NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HOME } from '../content/generated/home';
import { PAGES } from '../content/generated/pages';
import { imageViewOf } from '../content/image';

@Component({
  selector: 'app-home',
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  protected readonly page = PAGES['home'];
  protected readonly home = HOME;
  protected readonly profile = imageViewOf(HOME.profile);
  protected readonly tiles = HOME.tiles.map((t) => ({ ...t, image: imageViewOf(t.image) }));
}
