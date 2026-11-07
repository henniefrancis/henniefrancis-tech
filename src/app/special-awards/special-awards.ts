import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PAGES } from '../content/generated/pages';
import { SPECIAL_AWARDS } from '../content/generated/special-awards';

@Component({
  selector: 'app-special-awards',
  imports: [RouterLink],
  templateUrl: './special-awards.html',
})
export class SpecialAwards {
  protected readonly page = PAGES['special-awards'];
  protected readonly slides = SPECIAL_AWARDS.slides;
}
