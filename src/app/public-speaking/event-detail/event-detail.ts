import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { EventContent } from '../../content/content.types';
import { PAGES } from '../../content/generated/pages';
import { EVENTS } from '../../content/generated/speaking';

@Component({
  selector: 'app-event-detail',
  imports: [RouterLink],
  templateUrl: './event-detail.html',
})
export class EventDetail {
  // Bound from the route params via withComponentInputBinding().
  readonly event = input.required<string>();
  readonly year = input.required<string>();

  protected readonly pages = PAGES;
  protected readonly data = computed<EventContent | null>(() => EVENTS[`${this.event()}/${this.year()}`] ?? null);
}
