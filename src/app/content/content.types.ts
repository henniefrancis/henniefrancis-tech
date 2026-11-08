// Types of the generated content modules (src/app/content/generated/*, produced by tools/content).
// They mirror the JSON Schemas in tools/content/schemas after the generator has resolved image paths to
// URLs, count tokens to numbers, links to href or route, and paragraph blocks to string arrays.

export interface Img {
  src: string;
  alt: string;
}

export interface LinkedImage {
  name: string;
  url: string;
  image: Img;
}

export interface SiteContent {
  copyright: string;
  name: string;
}

export interface PageMetaContent {
  route: string;
  title: string;
  description?: string;
  heading?: string;
  breadcrumb?: string;
}

export type PageKey =
  | 'home'
  | 'biography'
  | 'current-role'
  | 'portfolio'
  | 'cv'
  | 'career-history'
  | 'projects'
  | 'blog'
  | 'social-media'
  | 'tech-stack'
  | 'special-awards'
  | 'certifications'
  | 'public-speaking'
  | 'not-found';

export type PagesContent = Record<PageKey, PageMetaContent>;

export interface Tile {
  name: string;
  route: string;
  image: Img;
}

export interface HomeContent {
  about: string[];
  heading: string;
  /** Name shown in the about card. */
  name: string;
  profile: Img;
  tagline: string[];
  tiles: Tile[];
}

export interface BiographyContent {
  paragraphs: string[];
  portrait: Img;
}

export interface NotFoundContent {
  homeLink: string;
  message: string[];
}

export interface PortfolioContent {
  tiles: Tile[];
}

export interface Project {
  badge?: string;
  description: string[];
  diagram?: Img;
  name: string;
}

export interface ProjectsContent {
  projects: Project[];
}

export interface BlogContent {
  intro: string;
  links: LinkedImage[];
}

export interface CurrentRoleContent {
  enabled: boolean;
  facts: { label: string; value: string }[];
  logo?: { image: Img; url: string };
}

export interface SocialLink {
  image: Img;
  name: string;
  /** Absent for an entry shown as an image only (no link). */
  url?: string;
}

export interface LinkGroup {
  items: LinkedImage[];
  name?: string;
}

export interface SocialContent {
  categories: { items: SocialLink[]; name?: string }[];
}

export interface TechStackContent {
  categories: (LinkGroup & { name: string })[];
}

export interface SpecialAwardsContent {
  slides: Img[];
}

export type CertVendor = 'aws' | 'microsoft' | 'mongodb' | 'other';
export type CertKind = 'certification' | 'extra-badge' | 'partner-badge';
export type CertStatus = 'active' | 'expired' | 'retired' | 'inprogress' | 'todo';

export interface CertBadgeContent {
  href?: string;
  image: Img;
  kind: CertKind;
  name: string;
  route?: string;
  status: CertStatus;
  vendor: CertVendor;
}

export interface CertCategory {
  badges: CertBadgeContent[];
  name: string;
}

export interface CertDetail {
  image: Img;
  title: string;
  type: string;
}

export interface EventLinkContent {
  href?: string;
  image: Img;
  label?: string;
  route?: string;
  title: string;
}

export interface EventContent {
  body: string[];
  header?: { image: Img; url: string };
  heading?: string;
  links: EventLinkContent[];
  title: string;
  year: string;
}

export interface GalleryContent {
  photos: Img[];
  title: string;
  year: string;
}

export interface YearGroup {
  name: string;
  talks: { image: Img; name: string; route: string }[];
}

export interface PrerenderParams {
  certDetails: { id: string; type: string }[];
  events: { event: string; year: string }[];
  galleries: { event: string; year: string }[];
}

export type RecordSummary =
  | { kind: 'event'; title: string; year: string; heading?: string }
  | { kind: 'gallery'; title: string; year: string }
  | { kind: 'certificate'; title: string };

export type RecordSummaries = Record<string, RecordSummary>;

export interface CvContent {
  awards: { heading: string; items: { flag?: string; link?: { text: string; url: string }; name: string; note?: string }[] };
  contact: { email: string; heading: string; location: string; phone: { display: string; e164: string }; website: string };
  education: { heading: string; items: { institution: string; title: string }[] };
  experience: { employers: { name: string; positions: { gap?: 'outside'; period: string; titles: string[] }[] }[]; heading: string };
  interests: { heading: string; rows: string[][] };
  languages: { heading: string; items: { level: string; name: string }[] };
  name: string;
  organizations: {
    heading: string;
    items: { bare?: true; description: string; name: string; period: string; roles: string[]; url: string }[];
  };
  skills: { heading: string; rows: string[][] };
  summary: string[];
  volunteer: { heading: string };
}

export type Responsibility = string | { group: string; items: string[] };

export interface CareerPosition {
  columns: 'wide' | 'medium' | 'narrow';
  period: string;
  reason: string;
  reasonLabel?: string;
  referee?: { email: string; name: string; phone: string };
  responsibilities: Responsibility[];
  titles: string[];
}

export interface CareerHistoryContent {
  labels: { positionDetails: string; reason: string; references: string; responsibilities: string };
  employers: { id: string; location: string; names: string[]; positions: CareerPosition[] }[];
}
