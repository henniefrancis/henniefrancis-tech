import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { IMAGE_LOADER_PROVIDER, imageSrc } from './content/image';
import { CertDetail } from './certifications/cert-detail/cert-detail';
import { EventDetail } from './public-speaking/event-detail/event-detail';
import { Gallery, startCarousel } from './public-speaking/gallery/gallery';
import { CERT_DETAILS, CERT_DETAIL_TYPES } from './content/generated/certifications';
import { PAGES } from './content/generated/pages';
import { EVENTS, GALLERIES } from './content/generated/speaking';

// These specs run against the synthetic fixture content (npm run content:fixtures).
async function renderWith(component: any, inputs: Record<string, string>): Promise<HTMLElement> {
  TestBed.configureTestingModule({ imports: [component], providers: [provideRouter([]), IMAGE_LOADER_PROVIDER] });
  const fixture = TestBed.createComponent(component);
  for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

const split = (key: string) => [key.slice(0, key.indexOf('/')), key.slice(key.indexOf('/') + 1)] as const;

describe('CertDetail', () => {
  const key = Object.keys(CERT_DETAILS)[0];
  const [type, id] = split(key);

  it('renders the certificate title, image, type name and parent breadcrumb', async () => {
    const el = await renderWith(CertDetail, { type, id });
    expect(el.querySelector('h1')?.textContent).toBe(CERT_DETAILS[key].title);
    expect(el.querySelector('.certificate img')?.getAttribute('src')).toBe(imageSrc(CERT_DETAILS[key].image));
    expect(el.querySelector('.certificate img')?.getAttribute('alt')).toBe(CERT_DETAILS[key].image.alt);
    expect(el.querySelector('.breadcrumb')?.textContent).toContain(CERT_DETAIL_TYPES[type]);
    expect(el.querySelector('.breadcrumb-item a[href="/certifications"]')?.textContent).toBe(PAGES['certifications'].breadcrumb);
  });

  it('shows a not-found message for an unknown certificate', async () => {
    const el = await renderWith(CertDetail, { type: 'zzz', id: 'nope' });
    expect(el.textContent).toContain('Certificate not found');
  });

  it('uses the generic Microsoft label when only the type is unknown but the record exists', async () => {
    CERT_DETAILS['zzz/known'] = { type: 'zzz', title: 'T', image: { id: 'abcdef0123456789', w: 10, h: 10, widths: [10], alt: 'T' } };
    try {
      const el = await renderWith(CertDetail, { type: 'zzz', id: 'known' });
      const crumbs = Array.from(el.querySelectorAll('.breadcrumb-item')).map((c) => c.textContent?.trim());
      expect(crumbs.filter((c) => c === 'Microsoft').length).toBe(2);
    } finally {
      delete CERT_DETAILS['zzz/known'];
    }
  });
});

describe('EventDetail', () => {
  it('renders the header, heading, paragraphs and every kind of link', async () => {
    const [event, year] = split('conf-one/2025');
    const el = await renderWith(EventDetail, { event, year });
    const d = EVENTS['conf-one/2025'];
    expect(el.querySelector('h1')?.textContent).toContain(d.title);
    expect(el.querySelector('.breadcrumb-item.current')?.textContent).toBe(`${d.title} ${d.year}`);
    expect(el.querySelector('.breadcrumb-item a[href="/public-speaking"]')?.textContent).toBe(PAGES['public-speaking'].breadcrumb);
    expect(el.querySelector('img.eventheader')?.getAttribute('src')).toBe(imageSrc(d.header!.image));
    expect(el.querySelector('a[title="' + d.header!.image.alt + '"]')?.getAttribute('href')).toBe(d.header!.url);
    expect(Array.from(el.querySelectorAll('p')).map((p) => p.textContent)).toEqual(d.body);
    expect(el.textContent).toContain(d.heading!);
    const links = Array.from(el.querySelectorAll('img.eventlink')).map((i) => i.closest('a')!);
    expect(links.map((a) => a.getAttribute('title'))).toEqual(['Session page', 'Event Photos', 'Full Video']);
    expect(links[0].getAttribute('href')).toBe('https://sessions.example.test/talk');
    expect(links[0].getAttribute('rel')).toBe('noopener noreferrer');
    expect(links[1].getAttribute('href')).toBe('/public-speaking/conf-one/photos/2025');
    expect(links[2].hasAttribute('href')).toBe(false);
    expect(el.querySelector('h2.eventheaderlink')?.textContent).toBe('Watch');
  });

  it('renders an event without header, heading, body or links', async () => {
    const [event, year] = split('conf-two/2024');
    const el = await renderWith(EventDetail, { event, year });
    expect(el.querySelector('img.eventheader')).toBeNull();
    expect(el.querySelectorAll('p').length).toBe(0);
    expect(el.querySelector('img.eventlink')).toBeNull();
    expect(el.querySelector('h1')?.textContent).toContain('Conference Two');
  });

  it('shows a not-found message for an unknown event', async () => {
    const el = await renderWith(EventDetail, { event: 'nope', year: '1999' });
    expect(el.textContent).toContain('Event not found');
  });
});

describe('Gallery', () => {
  afterEach(() => {
    delete (window as any).bootstrap;
  });

  it('renders every gallery record with its photos, first slide active', async () => {
    for (const k of Object.keys(GALLERIES)) {
      TestBed.resetTestingModule();
      const [event, year] = split(k);
      const el = await renderWith(Gallery, { event, year });
      expect(el.querySelectorAll('.carousel-item img').length).toBe(GALLERIES[k].photos.length);
      expect(Array.from(el.querySelectorAll('.carousel-item img')).map((i) => i.getAttribute('alt'))).toEqual(GALLERIES[k].photos.map((p) => p.alt));
      expect(el.querySelector('.carousel-item')?.classList.contains('active')).toBe(true);
      expect(el.querySelector('.breadcrumb-item a[href="/public-speaking"]')?.textContent).toBe(PAGES['public-speaking'].breadcrumb);
    }
  });

  it('renders no slides for an unknown gallery', async () => {
    const el = await renderWith(Gallery, { event: 'nope', year: '1999' });
    expect(el.querySelector('.carousel-item')).toBeNull();
    expect(el.textContent).toContain('Gallery not found');
  });

  it('has no photo views for an unknown gallery', () => {
    TestBed.configureTestingModule({ imports: [Gallery], providers: [provideRouter([]), IMAGE_LOADER_PROVIDER] });
    const fixture = TestBed.createComponent(Gallery);
    fixture.componentRef.setInput('event', 'nope');
    fixture.componentRef.setInput('year', '1999');
    expect((fixture.componentInstance as any).photos()).toEqual([]);
  });

  it('starts the Bootstrap carousel after render when Bootstrap is loaded', async () => {
    const ctor = vi.fn();
    (window as any).bootstrap = { Carousel: ctor };
    const [event, year] = split(Object.keys(GALLERIES)[0]);
    await renderWith(Gallery, { event, year });
    expect(ctor).toHaveBeenCalledTimes(1);
    expect(ctor.mock.calls[0][1]).toEqual({ interval: 2000, touch: false });
  });

  it('startCarousel does nothing without the element or without Bootstrap', () => {
    const ctor = vi.fn();
    const withEl = document.implementation.createHTMLDocument('x');
    const el = withEl.createElement('div');
    el.id = 'carouselExample';
    withEl.body.appendChild(el);
    const empty = document.implementation.createHTMLDocument('y');

    startCarousel(empty, { bootstrap: { Carousel: ctor } });
    startCarousel(withEl, {});
    startCarousel(withEl, { bootstrap: {} });
    expect(ctor).not.toHaveBeenCalled();

    startCarousel(withEl, { bootstrap: { Carousel: ctor } });
    expect(ctor).toHaveBeenCalledWith(el, { interval: 2000, touch: false });
  });
});
