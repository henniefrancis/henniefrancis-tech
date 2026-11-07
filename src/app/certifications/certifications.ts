import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { CertBadgeContent, CertCategory } from '../content/content.types';
import { CERT_CATEGORIES } from '../content/generated/certifications';
import { PAGES } from '../content/generated/pages';

const STATUS_TEXT: Record<string, string> = {
  active: 'active',
  inprogress: 'in progress',
  todo: 'to do',
  expired: 'expired',
  retired: 'retired',
};

export interface CertBadge extends CertBadgeContent {
  statusText: string;
}

export interface CertGroup {
  name: string;
  badges: CertBadge[];
}

/** Adds the visible status label text to each badge. */
export function buildCertGroups(categories: CertCategory[]): CertGroup[] {
  return categories.map((category) => ({
    name: category.name,
    badges: category.badges.map((badge) => ({ ...badge, statusText: STATUS_TEXT[badge.status] })),
  }));
}

@Component({
  selector: 'app-certifications',
  imports: [RouterLink],
  templateUrl: './certifications.html',
})
export class Certifications {
  protected readonly page = PAGES['certifications'];
  protected readonly groups = buildCertGroups(CERT_CATEGORIES);
}
