import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CURRENT_ROLE } from '../content/generated/current-role';
import { PAGES } from '../content/generated/pages';

@Component({
  selector: 'app-current-role',
  imports: [RouterLink],
  templateUrl: './current-role.html',
})
export class CurrentRole {
  protected readonly page = PAGES['current-role'];
  protected readonly role = CURRENT_ROLE;
}
