import { NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PAGES } from '../../content/generated/pages';
import { PROJECTS } from '../../content/generated/projects';
import { imageViewOf } from '../../content/image';

@Component({
  selector: 'app-projects',
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: './projects.html',
})
export class Projects {
  protected readonly pages = PAGES;
  protected readonly projects = PROJECTS.projects.map((p) => ({
    ...p,
    diagram: p.diagram && imageViewOf(p.diagram, '(max-width: 600px) 100vw, 960px'),
  }));
}
