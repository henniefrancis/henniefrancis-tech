import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { CareerPosition, Responsibility } from '../../content/content.types';
import { CAREER_HISTORY } from '../../content/generated/career-history';
import { PAGES } from '../../content/generated/pages';
import { dividerSegments } from '../../shared/divider-segments';

/** Grid column classes of the responsibilities row: a wide, medium or narrow list. */
export function columnClasses(columns: CareerPosition['columns']): [string, string, string] {
  if (columns === 'wide') return ['col-1', 'col-10', 'col-1'];
  if (columns === 'medium') return ['col-4', 'col-6', 'col-2'];
  return ['col-4', 'col-5', 'col-3'];
}

/** True for a responsibility that groups items under a heading. */
export function isGroup(item: Responsibility): item is { group: string; items: string[] } {
  return typeof item !== 'string';
}

@Component({
  selector: 'app-career-history',
  imports: [RouterLink],
  templateUrl: './career-history.html',
})
export class CareerHistory {
  protected readonly pages = PAGES;
  protected readonly career = CAREER_HISTORY;
  protected readonly columnClasses = columnClasses;
  protected readonly isGroup = isGroup;
  protected readonly segments = dividerSegments;
}
