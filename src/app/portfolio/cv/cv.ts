import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CV } from '../../content/generated/cv';
import { PAGES } from '../../content/generated/pages';
import { dividerSegments } from '../../shared/divider-segments';

/** Splits a list into rows of the given size (the last row may be shorter). */
export function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

/** Grid column classes for a row of skills: four names fill the row, three are centred. */
export function skillLayout(row: string[]): { offset: string; cols: string[] } {
  return row.length === 4
    ? { offset: 'col-1', cols: ['col-3', 'col-3', 'col-3', 'col-2'] }
    : { offset: 'col-3', cols: row.map(() => 'col-3') };
}

@Component({
  selector: 'app-cv',
  imports: [RouterLink],
  templateUrl: './cv.html',
})
export class Cv {
  protected readonly pages = PAGES;
  protected readonly cv = CV;
  protected readonly skillLayout = skillLayout;
  protected readonly segments = dividerSegments;
  protected readonly organizationRows = chunk(CV.organizations.items, 2);
  protected readonly educationRows = chunk(CV.education.items, 2);
}
