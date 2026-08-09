import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Tile {
  id: string;
  name: string;
  route: string;
  image: string; // filename under imageBase
}

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  /** Same S3 folder the static site used for the index tiles + profile. */
  protected readonly imageBase =
    'https://henniefrancis-511489843375-af-south-1-an.s3.af-south-1.amazonaws.com/public/henniefrancis-tech/index/';

  protected readonly profileImage = this.imageBase + 'profile.png';

  /** Dashboard tiles — routes are the clean Angular paths (filled in as pages migrate). */
  protected readonly tiles: Tile[] = [
    { id: 'biography', name: 'Biography', route: '/biography', image: 'biography.png' },
    { id: 'current-role', name: 'Current Role', route: '/current-role', image: 'current-role.png' },
    { id: 'portfolio', name: 'Portfolio of Evidence', route: '/portfolio', image: 'portfolio.png' },
    { id: 'social-media', name: 'Social Media', route: '/social-media', image: 'social-media.png' },
    { id: 'public-speaking', name: 'Public Speaking', route: '/public-speaking', image: 'public-speaking.png' },
    { id: 'blog', name: 'Blog', route: '/blog', image: 'blog.png' },
    { id: 'tech-stack', name: 'Tech Stack', route: '/tech-stack', image: 'tech-stack.png' },
    { id: 'certifications', name: 'Certifications', route: '/certifications', image: 'certifications.png' },
    { id: 'special-awards', name: 'Special Awards', route: '/special-awards', image: 'special-awards.png' },
  ];
}
