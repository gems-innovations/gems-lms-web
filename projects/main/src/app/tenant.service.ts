import { Injectable, REQUEST, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BrandingService, environment } from 'shared';
import { resolveTenantSlug } from './tenant-slug';
import type { IPublicCourse } from './public/public-catalog.service';

export interface IPublicHome {
  institutionId: string;
  name: string;
  slug: string;
  version: number | null;
  /** BASE: landing de la institución con su CSS y un banner opcional; CUSTOM: su HTML reemplaza la landing. */
  mode: 'BASE' | 'CUSTOM';
  html: string | null;
  css: string | null;
  branding: {
    primaryColor: string | null; secondaryColor: string | null; accentColor: string | null;
    logoUrl: string | null; faviconUrl: string | null; darkMode: boolean | null;
  } | null;
}

/**
 * Institución del subdominio actual: su marca y su home publicada. Se carga antes de pintar la
 * primera página (también en el servidor), para que no haya parpadeo de la marca por defecto.
 */
@Injectable({ providedIn: 'root' })
export class TenantService {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);
  private readonly request = inject(REQUEST, { optional: true });
  private readonly branding = inject(BrandingService);

  /** Institución del subdominio; solo se fija cuando existe, así que null = portada normal de GEMS. */
  readonly slug = signal<string | null>(null);
  readonly home = signal<IPublicHome | null>(null);
  /** Cursos publicados de la institución, para la landing base y el marcador {{cursos}}. */
  readonly courses = signal<IPublicCourse[]>([]);

  async load(): Promise<void> {
    const baseDomain = (globalThis as { TENANT_BASE_DOMAIN?: string }).TENANT_BASE_DOMAIN || 'gemsinnovations.com';
    const host = this.request?.headers.get('host') ?? this.document.location?.hostname;
    const slug = resolveTenantSlug(host, baseDomain);
    if (!slug) return;
    try {
      const home = await firstValueFrom(this.http.get<IPublicHome>(`${environment.apiBaseUrl}/public/home/${slug}`));
      this.slug.set(slug);
      this.home.set(home);
      this.courses.set(await firstValueFrom(
        this.http.get<IPublicCourse[]>(`${environment.apiBaseUrl}/public/institutions/${home.institutionId}/courses`),
      ).catch(() => []));
      this.applyBranding(home);
    } catch {
      // Subdominio sin institución (o API sin la función): se ve la portada de GEMS, como en cualquier otro host.
    }
  }

  private applyBranding(home: IPublicHome): void {
    const b = home.branding;
    if (b?.primaryColor) {
      this.branding.apply({
        colorPrimary: b.primaryColor,
        colorSecondary: b.secondaryColor ?? undefined,
        logoUrl: b.logoUrl ?? undefined,
        darkMode: b.darkMode ?? undefined,
      });
    }
    if (b?.faviconUrl) {
      const link = this.document.querySelector<HTMLLinkElement>('link[rel~="icon"]')
        ?? this.document.head.appendChild(Object.assign(this.document.createElement('link'), { rel: 'icon' }));
      link.href = b.faviconUrl;
    }
  }
}
