import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NOT_FOUND } from '../content/generated/not-found';
import { PAGES } from '../content/generated/pages';

/** Shown for any address that matches no page. Prerendered and also served as 404.html. */
@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  templateUrl: './not-found.html',
})
export class NotFound {
  protected readonly page = PAGES['not-found'];
  protected readonly content = NOT_FOUND;
}
