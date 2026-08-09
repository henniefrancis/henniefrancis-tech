import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

const INDEX =
  'https://henniefrancis-511489843375-af-south-1-an.s3.af-south-1.amazonaws.com/public/henniefrancis-tech/index/';

@Component({
  selector: 'app-portfolio',
  imports: [RouterLink],
  templateUrl: './portfolio.html',
})
export class Portfolio {
  protected readonly tiles = [
    { name: 'Curriculum Vitae', route: '/portfolio/cv', src: INDEX + 'cv.png' },
    { name: 'Career History', route: '/portfolio/career-history', src: INDEX + 'career-history.png' },
    { name: 'Projects', route: '/portfolio/projects', src: INDEX + 'projects.png' },
  ];
}
