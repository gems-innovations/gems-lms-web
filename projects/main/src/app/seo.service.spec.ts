import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { DEFAULT_SEO, IRouteSeo, SeoService } from './seo.service';

/** Árbol de rutas mínimo: raíz → hija con `data`. */
function snapshot(url: string, data: { seo?: IRouteSeo } = {}): RouterStateSnapshot {
  const child = { data, firstChild: null } as unknown as ActivatedRouteSnapshot;
  const root = { data: {}, firstChild: child } as unknown as ActivatedRouteSnapshot;
  return { url, root } as unknown as RouterStateSnapshot;
}

describe('SeoService', () => {
  let seo: SeoService;
  let doc: Document;
  const content = (selector: string) => doc.head.querySelector<HTMLMetaElement>(`meta[${selector}]`)?.content;

  beforeEach(() => {
    seo = TestBed.inject(SeoService);
    doc = TestBed.inject(DOCUMENT);
  });

  it('writes the description, canonical and share card of the route', () => {
    seo.apply(snapshot('/t/nether?utm_source=ig#x', {
      seo: { description: 'Cinco preguntas del Nether.', image: '/og/taps.png', imageAlt: 'Un Tap' },
    }), 'Tap de Nether');

    const origin = doc.location.origin;
    expect(content('name="description"')).toBe('Cinco preguntas del Nether.');
    expect(doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.getAttribute('href')).toBe(`${origin}/t/nether`);
    expect(content('property="og:title"')).toBe('Tap de Nether');
    expect(content('property="og:url"')).toBe(`${origin}/t/nether`);
    expect(content('property="og:image"')).toBe(`${origin}/og/taps.png`);
    expect(content('property="og:image:alt"')).toBe('Un Tap');
    expect(content('name="twitter:card"')).toBe('summary_large_image');
    expect(content('name="robots"')).toBe('index, follow');
  });

  it('falls back to the GEMS LMS card and keeps a single canonical', () => {
    seo.apply(snapshot('/retos', { seo: { description: 'Retos.' } }), 'Retos');
    seo.apply(snapshot('/cursos/6'), 'Curso gratis');

    expect(doc.head.querySelectorAll('link[rel="canonical"]').length).toBe(1);
    expect(content('name="description"')).toBe(DEFAULT_SEO.description);
    expect(content('property="og:image"')).toBe(`${doc.location.origin}${DEFAULT_SEO.image}`);
    expect(content('property="og:image:alt"')).toBe(DEFAULT_SEO.imageAlt);
  });

  it('marks pages that should stay out of search engines', () => {
    seo.apply(snapshot('/not-found', { seo: { description: 'No existe.', noindex: true } }), 'Página no encontrada');
    expect(content('name="robots"')).toBe('noindex');
  });
});
