import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-biography',
  imports: [RouterLink],
  templateUrl: './biography.html',
  styleUrl: './biography.scss',
})
export class Biography {
  protected readonly portrait =
    'https://henniefrancis-511489843375-af-south-1-an.s3.af-south-1.amazonaws.com/public/henniefrancis-tech/biography/portrait.png';

  protected readonly paragraphs: string[] = [
    'Residing in the vibrant city of Cape Town, South Africa, Hennie Francis is a driving force in the world of technology.',
    'Hennie Francis is a highly experienced Cloud and Technology Strategist with over 20 years of commercial enterprise experience delivering transformative technology solutions. He involves himself with organizations to modernize platforms, solve complex challenges, and turn cloud strategy into measurable business impact.',
    'He is the founder and driving force behind AWS Community South Africa. He is also an AWS Community Builder and AWS User Group Leader for the Cape Town cloud community. Known for his broad and deep technology expertise, Hennie operates comfortably across complex enterprise environments, bringing clarity, structure, and momentum to large-scale initiatives.',
    'A seasoned keynote speaker and international presenter, Hennie has delivered both technical and non-technical talks on global stages, sharing practical engineering lessons, strategic insight, and real-world experience. His approach blends technical depth with authenticity — shaped by decades of building, scaling, and leading in fast-moving environments.',
    "His core belief is that when you have a genuine passion for technology and a profound love for your daily work, it never truly feels like ''work''.",
    'What truly ignites Hennie’s enthusiasm is the opportunity to learn something new, tackle challenges that look impossible at first glance, and fully immerse himself in technology. He thrives on growth, complex problems, and the energy of being surrounded by builders, thinkers, and innovators. Tech events are less “optional” and more “mission critical” in his calendar.',
    'When he’s not geeking out over cloud architecture or mentoring the next generation of technologists, Hennie is in the sky whenever possible. A true aviation enthusiast, he spends every spare moment he can flying, surrounded by jet engines, runways, and the precision of flight.',
    'He is also a proud tech geek with a carefully curated collection of conference swag. In his defense, every hoodie has a story, every T-shirt represents a community, and somewhere in the cloud architect handbook, it clearly states: free swag is a performance bonus.',
    "Hennie's impressive credentials include 3 AWS Certifications, AWS Community Builder, AWS User Group Leader and an astounding 19 Microsoft Certifications. He holds the prestigious titles of Microsoft Certified Trainer and Microsoft Technology Specialist.",
  ];
}
