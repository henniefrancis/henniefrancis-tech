import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PAGES } from '../content/generated/pages';
import { TECH_STACK } from '../content/generated/tech-stack';

@Component({
  selector: 'app-tech-stack',
  imports: [RouterLink],
  templateUrl: './tech-stack.html',
})
export class TechStack {
  protected readonly page = PAGES['tech-stack'];
  protected readonly groups = TECH_STACK.categories;
}
