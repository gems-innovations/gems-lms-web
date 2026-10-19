import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

/** Metadatos de una página pública: van en `data.seo` de la ruta (o los entrega un resolver con esa clave). */
export interface IRouteSeo {
  description: string;
  /** Imagen de la tarjeta al compartir (1200×630), ruta absoluta del sitio. Por defecto, la de GEMS LMS. */
  image?: string;
  imageAlt?: string;
  type?: 'website' | 'article';
  /** Páginas que no deben aparecer en buscadores (no encontrada). */
  noindex?: boolean;
}

/**
 * Origen público del sitio. En el navegador es el host actual (un subdominio de institución tiene el suyo); durante
 * el prerender (build) no hay host, y los rastreadores de WhatsApp o Instagram necesitan URLs absolutas.
 */
export const SITE_ORIGIN = 'https://lms.gemsinnovations.com';
export const SITE_NAME = 'GEMS LMS';
export const DEFAULT_SEO: Required<Pick<IRouteSeo, 'description' | 'image' | 'imageAlt'>> = {
  description: 'Cursos gratis y sin registro, retos de lógica y quizzes para jugar. Aprendizaje, formación y seguimiento en un solo lugar.',
  image: '/og/gems-lms.png',
  imageAlt: 'GEMS LMS: cursos gratis, sin registro',
};

/**
 * Título, descripción, canonical y tarjeta para compartir (Open Graph y Twitter) de cada página. Lo llama la
 * estrategia de títulos en cada navegación, así que también queda escrito en el HTML prerenderizado.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  apply(snapshot: RouterStateSnapshot, title: string): void {
    const seo = this.routeSeo(snapshot.root);
    const description = seo?.description ?? DEFAULT_SEO.description;
    const url = this.absolute(snapshot.url.split(/[?#]/)[0] || '/');
    const image = this.absolute(seo?.image ?? DEFAULT_SEO.image);
    const imageAlt = seo?.imageAlt ?? (seo?.image ? title : DEFAULT_SEO.imageAlt);

    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: seo?.noindex ? 'noindex' : 'index, follow' });
    this.setCanonical(url);

    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });
    this.meta.updateTag({ property: 'og:locale', content: 'es_CO' });
    this.meta.updateTag({ property: 'og:type', content: seo?.type ?? 'website' });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ property: 'og:image:width', content: '1200' });
    this.meta.updateTag({ property: 'og:image:height', content: '630' });
    this.meta.updateTag({ property: 'og:image:alt', content: imageAlt });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: image });
  }

  /** La ruta más profunda con `data.seo` manda (las hijas heredan de sus padres). */
  private routeSeo(route: ActivatedRouteSnapshot): IRouteSeo | undefined {
    let found: IRouteSeo | undefined;
    for (let r: ActivatedRouteSnapshot | null = route; r; r = r.firstChild) {
      const seo = r.data?.['seo'] as IRouteSeo | undefined;
      if (seo) found = seo;
    }
    return found;
  }

  private absolute(path: string): string {
    const origin = this.isBrowser ? this.document.location?.origin || SITE_ORIGIN : SITE_ORIGIN;
    return /^https?:\/\//.test(path) ? path : origin + (path.startsWith('/') ? path : `/${path}`);
  }

  private setCanonical(url: string): void {
    const head = this.document.head;
    let link = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}
