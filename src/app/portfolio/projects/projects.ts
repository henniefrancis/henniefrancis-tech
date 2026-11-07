import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PAGES } from '../../content/generated/pages';
import { PROJECTS } from '../../content/generated/projects';

@Component({
  selector: 'app-projects',
  imports: [RouterLink],
  templateUrl: './projects.html',
})
export class Projects {
  protected readonly pages = PAGES;
  protected readonly projects = PROJECTS.projects;
}
