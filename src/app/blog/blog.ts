import { NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ImageRef, imageView } from '../content/image';

const MEDIUM: ImageRef = { id: 'c5e2748eec32249d', w: 700, h: 210, widths: [350, 700] };
const DEV: ImageRef = { id: 'ebd74f08618e654a', w: 700, h: 210, widths: [350, 700] };

@Component({
  selector: 'app-blog',
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: './blog.html',
})
export class Blog {
  protected readonly links = [
    { name: 'Medium', url: 'http://www.medium.com/@henniefrancis', image: imageView(MEDIUM) },
    { name: 'DEV', url: 'https://dev.to/henniefrancis', image: imageView(DEV) },
  ];
}
