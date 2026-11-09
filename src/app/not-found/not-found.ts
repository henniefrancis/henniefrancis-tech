import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Shown for any address that matches no page. Prerendered and also served as 404.html. */
@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  templateUrl: './not-found.html',
})
export class NotFound {}
