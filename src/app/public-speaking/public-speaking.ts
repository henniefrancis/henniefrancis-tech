import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PAGES } from '../content/generated/pages';
import { SPEAKING_INDEX } from '../content/generated/speaking';

@Component({
  selector: 'app-public-speaking',
  imports: [RouterLink],
  templateUrl: './public-speaking.html',
})
export class PublicSpeaking {
  protected readonly page = PAGES['public-speaking'];
  protected readonly years = SPEAKING_INDEX;
}
