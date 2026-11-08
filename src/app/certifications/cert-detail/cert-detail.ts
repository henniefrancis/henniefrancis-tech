import { NgOptimizedImage } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { CertDetail as CertDetailContent } from '../../content/content.types';
import { CERT_DETAILS, CERT_DETAIL_TYPES } from '../../content/generated/certifications';
import { PAGES } from '../../content/generated/pages';
import { imageViewOf } from '../../content/image';

@Component({
  selector: 'app-cert-detail',
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: './cert-detail.html',
})
export class CertDetail {
  readonly type = input.required<string>();
  readonly id = input.required<string>();

  protected readonly pages = PAGES;
  protected readonly imageViewOf = imageViewOf;
  protected readonly data = computed<CertDetailContent | null>(() => CERT_DETAILS[`${this.type()}/${this.id()}`] ?? null);
  protected readonly typeName = computed(() => CERT_DETAIL_TYPES[this.type()] ?? 'Microsoft');
}
