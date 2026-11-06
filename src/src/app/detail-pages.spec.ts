import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CertDetail } from './certifications/cert-detail/cert-detail';
import { CERT_DETAILS } from './certifications/cert-detail/cert-details.data';
import { EventDetail, buildEventLinks } from './public-speaking/event-detail/event-detail';
import { EVENTS } from './public-speaking/data/events.data';
import { Gallery, buildPhotos, startCarousel } from './public-speaking/gallery/gallery';
import { GALLERIES } from './public-speaking/data/galleries.data';

async function renderWith(component: any, inputs: Record<string, string>): Promise<HTMLElement> {
  TestBed.configureTestingModule({ imports: [component], providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(component);
  for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('CertDetail', () => {
  const key = Object.keys(CERT_DETAILS)[0];
  const [type, id] = [key.slice(0, key.indexOf('/')), key.slice(key.indexOf('/') + 1)];

  it('renders the certificate title, image and type name', async () => {
    const el = await renderWith(CertDetail, { type, id });
    expect(el.querySelector('h1')?.textContent).toBe(CERT_DETAILS[key].title);
    expect(el.querySelector('.certificate img')?.getAttribute('src')).toBe(CERT_DETAILS[key].image);
    expect(el.querySelector('.breadcrumb')?.textContent).toContain('Microsoft Certified');
  });

  it('shows a not-found message for an unknown certificate', async () => {
    const el = await renderWith(CertDetail, { type: 'zzz', id: 'nope' });
    expect(el.textContent).toContain('Certificate not found');
  });

  it('uses the generic Microsoft label when only the type is unknown but the record exists', async () => {
    const orig = CERT_DETAILS['zzz/known'];
    CERT_DETAILS['zzz/known'] = { title: 'T', image: 'i.png' };
    try {
      const el = await renderWith(CertDetail, { type: 'zzz', id: 'known' });
      const crumbs = Array.from(el.querySelectorAll('.breadcrumb-item')).map((c) => c.textContent?.trim());
      expect(crumbs).toContain('Microsoft');
      expect(crumbs.filter((c) => c === 'Microsoft').length).toBe(2);
    } finally {
      if (orig) CERT_DETAILS['zzz/known'] = orig;
      else delete CERT_DETAILS['zzz/known'];
    }
  });
});

describe('EventDetail', () => {
  it('renders every event record with a heading', async () => {
    for (const k of Object.keys(EVENTS)) {
      TestBed.resetTestingModule();
      const [event, year] = [k.slice(0, k.indexOf('/')), k.slice(k.indexOf('/') + 1)];
      const el = await renderWith(EventDetail, { event, year });
      expect(el.querySelector('h1')?.textContent).toContain(EVENTS[k].title);
    }
  });

  it('shows a not-found message for an unknown event', async () => {
    const el = await renderWith(EventDetail, { event: 'nope', year: '1999' });
    expect(el.textContent).toContain('Event not found');
  });

  it('buildEventLinks returns nothing without a record', () => {
    expect(buildEventLinks(null, 'e')).toEqual([]);
    expect(buildEventLinks({}, 'e')).toEqual([]);
  });

  it('buildEventLinks drops disabled and empty links and resolves external, photos and plain links', () => {
    const out = buildEventLinks(
      {
        assetBaseUrl: 'b/',
        links: [
          null,
          { url: 'https://x.test/a', title: 'Ext', image: 'a.png', alt: 'Alt', label: 'Lbl' },
          { url: 'photos/2025-cl.html', title: 'Photos', image: 'p.png' },
          { url: 'other/page', title: 'Plain', image: 'o.png' },
          { url: 'https://x.test/off', title: 'Off', image: 'x.png', enabled: false },
          { title: 'NoUrl', image: 'n.png' },
        ],
      },
      'aws-summit',
    );
    expect(out).toEqual([
      { title: 'Ext', alt: 'Alt', label: 'Lbl', external: true, href: 'https://x.test/a', route: null, src: 'b/a.png' },
      {
        title: 'Photos',
        alt: 'Photos',
        label: null,
        external: false,
        href: null,
        route: '/public-speaking/aws-summit/photos/2025-cl',
        src: 'b/p.png',
      },
      { title: 'Plain', alt: 'Plain', label: null, external: false, href: null, route: null, src: 'b/o.png' },
    ]);
  });
});

describe('Gallery', () => {
  afterEach(() => {
    delete (window as any).bootstrap;
  });

  it('renders every gallery record with its photos, first slide active', async () => {
    for (const k of Object.keys(GALLERIES)) {
      TestBed.resetTestingModule();
      const [event, year] = [k.slice(0, k.indexOf('/')), k.slice(k.indexOf('/') + 1)];
      const el = await renderWith(Gallery, { event, year });
      expect(el.querySelectorAll('.carousel-item img').length).toBe(GALLERIES[k].photos.length);
      expect(el.querySelector('.carousel-item')?.classList.contains('active')).toBe(true);
    }
  });

  it('renders no slides for an unknown gallery', async () => {
    const el = await renderWith(Gallery, { event: 'nope', year: '1999' });
    expect(el.querySelector('.carousel-item')).toBeNull();
  });

  it('starts the Bootstrap carousel after render when Bootstrap is loaded', async () => {
    const ctor = vi.fn();
    (window as any).bootstrap = { Carousel: ctor };
    const k = Object.keys(GALLERIES)[0];
    await renderWith(Gallery, { event: k.slice(0, k.indexOf('/')), year: k.slice(k.indexOf('/') + 1) });
    expect(ctor).toHaveBeenCalledTimes(1);
    expect(ctor.mock.calls[0][1]).toEqual({ interval: 2000, touch: false });
  });

  it('buildPhotos joins base, folder and file, and tolerates missing data', () => {
    expect(buildPhotos(null)).toEqual([]);
    expect(buildPhotos({ assetBaseUrl: 'b/', photoBase: 'p/' })).toEqual([]);
    expect(buildPhotos({ assetBaseUrl: 'b/', photoBase: 'p/', photos: [{ image: '1.jpg', alt: 'One' }] })).toEqual([
      { src: 'b/p/1.jpg', alt: 'One' },
    ]);
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
