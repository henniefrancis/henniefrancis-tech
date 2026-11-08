import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NotFound } from './not-found';

describe('NotFound', () => {
  it('explains the problem, has one h1 and links home', async () => {
    TestBed.configureTestingModule({ imports: [NotFound], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(NotFound);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('h1').length).toBe(1);
    expect(el.querySelector('h1')?.textContent).toBe('Page not found');
    expect(el.textContent).toContain('does not exist');
    expect(Array.from(el.querySelectorAll('a')).every((a) => a.getAttribute('href') === '/')).toBe(true);
  });
});
