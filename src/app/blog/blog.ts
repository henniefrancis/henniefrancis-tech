import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BLOG } from '../content/generated/blog';
import { PAGES } from '../content/generated/pages';

@Component({
  selector: 'app-blog',
  imports: [RouterLink],
  templateUrl: './blog.html',
})
export class Blog {
  protected readonly page = PAGES['blog'];
  protected readonly blog = BLOG;
}
