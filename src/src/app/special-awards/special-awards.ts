import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

const AWARDS =
  'https://henniefrancis-511489843375-af-south-1-an.s3.af-south-1.amazonaws.com/public/henniefrancis-tech/special-awards/';

@Component({
  selector: 'app-special-awards',
  imports: [RouterLink],
  templateUrl: './special-awards.html',
})
export class SpecialAwards {
  protected readonly slides = [
    { src: AWARDS + 'community-builder.png', alt: 'AWS Community Builder' },
    { src: AWARDS + 'rockstar.png', alt: 'Rockstar' },
  ];
}
