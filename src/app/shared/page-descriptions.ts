/**
 * Meta descriptions for the static pages, keyed by route path. Drafted from the
 * existing page copy. Event, gallery and certificate pages derive theirs from
 * their own record (see seo.ts).
 */
export const PAGE_DESCRIPTIONS: Readonly<Record<string, string>> = {
  '/': 'Hennie Francis: Cloud and Technology Strategist, AWS Community Builder, AWS User Group Leader and technology speaker based in Cape Town, South Africa.',
  '/biography':
    'Hennie Francis is a Cloud and Technology Strategist from Cape Town with over 20 years of commercial enterprise experience and the founder of AWS Community South Africa.',
  '/current-role': "Hennie Francis's current role.",
  '/portfolio': "Hennie Francis's portfolio of evidence: curriculum vitae, career history and projects.",
  '/portfolio/cv':
    'Curriculum vitae of Hennie Francis, a Cloud and Technology Strategist with over 20 years of experience delivering enterprise technology solutions.',
  '/portfolio/career-history':
    'Career history of Hennie Francis across software and cloud companies in Cape Town, Johannesburg and Pretoria.',
  '/portfolio/projects': 'Projects by Hennie Francis, including the website that showcases his personal brand.',
  '/social-media':
    'Find Hennie Francis on LinkedIn, GitHub, YouTube, Twitch and other social media and community platforms.',
  '/public-speaking':
    'Talks and events where Hennie Francis has spoken, with session details and photos, from 2023 to 2026.',
  '/blog': 'The tech blog of Hennie Francis. Coming soon.',
  '/tech-stack':
    'The tools and technologies Hennie Francis works with, from .NET and Java to infrastructure as code and cloud platforms.',
  '/certifications': 'The AWS, Microsoft and other technology certifications and badges earned by Hennie Francis.',
  '/special-awards': 'Special awards and recognition received by Hennie Francis.',
};

/** Used for any page that has no specific description. */
export const DEFAULT_DESCRIPTION = PAGE_DESCRIPTIONS['/'];
