import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

const SOCIAL =
  'https://henniefrancis-511489843375-af-south-1-an.s3.af-south-1.amazonaws.com/public/henniefrancis-tech/social-media/';

@Component({
  selector: 'app-blog',
  imports: [RouterLink],
  templateUrl: './blog.html',
})
export class Blog {
  protected readonly links = [
    { name: 'Medium', url: 'http://www.medium.com/@henniefrancis', src: SOCIAL + 'medium.png' },
    { name: 'DEV', url: 'https://dev.to/henniefrancis', src: SOCIAL + 'dev.png' },
  ];
}
