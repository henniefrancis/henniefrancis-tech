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
  | 'public-speaking';

export type PagesContent = Record<PageKey, PageMetaContent>;

export interface Tile {
  name: string;
  route: string;
  image: Img;
}

export interface HomeContent {
  about: string[];
  heading: string;
  profile: Img;
  tagline: string[];
  tiles: Tile[];
}

export interface BiographyContent {
  paragraphs: string[];
  portrait: Img;
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
