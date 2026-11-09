import { Component, afterNextRender, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Seo } from './shared/seo';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  constructor() {
    inject(Seo).start();

    // Flow-field canvas background. Browser-only (SSR-safe via afterNextRender)
    // and loaded in order so index.js sees the helpers from vector.js/noise.js.
    afterNextRender(() => {
      for (const src of ['/scripts/vector.js', '/scripts/noise.js', '/scripts/index.js']) {
        const s = document.createElement('script');
        s.src = src;
        s.async = false; // preserve execution order for dynamically-added scripts
        document.body.appendChild(s);
      }
    });
  }
}
