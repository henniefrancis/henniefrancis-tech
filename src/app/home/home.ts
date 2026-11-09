import { NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { imageView } from '../content/image';
import data from './home.data.json';

@Component({
  selector: 'app-home',
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  /** Profile photo and dashboard tiles (routes are the clean Angular paths). */
  protected readonly profile = { ...data.profile, image: imageView(data.profile.image) };
  protected readonly tiles = data.tiles.map((t) => ({ ...t, image: imageView(t.image) }));
}
