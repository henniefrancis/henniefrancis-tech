import { NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { CertBadgeContent, CertCategory } from '../content/content.types';
import { CERT_CATEGORIES } from '../content/generated/certifications';
import { PAGES } from '../content/generated/pages';
import { ImageViewWithAlt, imageViewOf } from '../content/image';

const STATUS_TEXT: Record<string, string> = {
  active: 'active',
  inprogress: 'in progress',
  todo: 'to do',
  expired: 'expired',
  retired: 'retired',
};

export interface CertBadge extends Omit<CertBadgeContent, 'image'> {
  statusText: string;
  image: ImageViewWithAlt;
}

export interface CertGroup {
  name: string;
  badges: CertBadge[];
}

/** Adds the visible status label text to each badge. */
export function buildCertGroups(categories: CertCategory[]): CertGroup[] {
  return categories.map((category) => ({
    name: category.name,
    badges: category.badges.map((badge) => ({
      ...badge,
      statusText: STATUS_TEXT[badge.status],
      image: imageViewOf(badge.image),
    })),
  }));
}

@Component({
  selector: 'app-certifications',
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: './certifications.html',
})
export class Certifications {
  protected readonly page = PAGES['certifications'];
  protected readonly groups = buildCertGroups(CERT_CATEGORIES);
}
