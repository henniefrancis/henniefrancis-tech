import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BIOGRAPHY } from '../content/generated/biography';
import { PAGES } from '../content/generated/pages';

@Component({
  selector: 'app-biography',
  imports: [RouterLink],
  templateUrl: './biography.html',
  styleUrl: './biography.scss',
})
export class Biography {
  protected readonly page = PAGES['biography'];
  protected readonly bio = BIOGRAPHY;
}
