import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => {
    document.body.querySelectorAll('script[src^="/scripts/"]').forEach((s) => s.remove());
  });

  it('renders the flow-field canvas, the router outlet and the footer', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('canvas#flowfield')).toBeTruthy();
    expect(el.querySelector('router-outlet')).toBeTruthy();
    expect(el.querySelector('footer')?.textContent).toContain('Hennie Francis - All rights reserved');
  });

  it('loads the flow-field scripts in order, without async, after the first render', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const scripts = Array.from(document.body.querySelectorAll<HTMLScriptElement>('script[src^="/scripts/"]'));
    expect(scripts.map((s) => s.getAttribute('src'))).toEqual([
      '/scripts/vector.js',
      '/scripts/noise.js',
      '/scripts/index.js',
    ]);
    expect(scripts.every((s) => s.async === false)).toBe(true);
  });
});
