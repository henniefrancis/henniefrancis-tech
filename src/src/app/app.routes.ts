import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Biography } from './biography/biography';
import { CurrentRole } from './current-role/current-role';
import { Portfolio } from './portfolio/portfolio';
import { SocialMedia } from './social-media/social-media';
import { PublicSpeaking } from './public-speaking/public-speaking';
import { Blog } from './blog/blog';
import { TechStack } from './tech-stack/tech-stack';
import { Certifications } from './certifications/certifications';
import { SpecialAwards } from './special-awards/special-awards';
import { EventDetail } from './public-speaking/event-detail/event-detail';
import { Gallery } from './public-speaking/gallery/gallery';
import { Cv } from './portfolio/cv/cv';
import { CareerHistory } from './portfolio/career-history/career-history';
import { Projects } from './portfolio/projects/projects';
import { CertDetail } from './certifications/cert-detail/cert-detail';

export const routes: Routes = [
  { path: '', component: Home, title: 'Hennie Francis' },
  { path: 'biography', component: Biography, title: "Hennie's Biography" },
  { path: 'current-role', component: CurrentRole, title: "Hennie's Current Role" },
  { path: 'portfolio', component: Portfolio, title: "Hennie's Portfolio" },
  { path: 'social-media', component: SocialMedia, title: "Hennie's Social Media" },
  { path: 'public-speaking', component: PublicSpeaking, title: "Hennie's Public Speaking" },
  { path: 'blog', component: Blog, title: "Hennie's Blog" },
  { path: 'tech-stack', component: TechStack, title: 'Tech Stack' },
  { path: 'certifications', component: Certifications, title: "Hennie's Certifications" },
  { path: 'special-awards', component: SpecialAwards, title: 'Special Awards' },

  // Public-speaking sub-pages (gallery route is more specific, so it comes first).
  { path: 'public-speaking/:event/photos/:year', component: Gallery },
  { path: 'public-speaking/:event/:year', component: EventDetail },

  { path: 'portfolio/cv', component: Cv, title: "Hennie's CV" },
  { path: 'portfolio/career-history', component: CareerHistory, title: "Hennie's Career History" },
  { path: 'portfolio/projects', component: Projects, title: "Hennie's Projects" },

  { path: 'certifications/microsoft/:type/:id', component: CertDetail },

  // Anything else falls back to home.
  { path: '**', redirectTo: '' },
];
