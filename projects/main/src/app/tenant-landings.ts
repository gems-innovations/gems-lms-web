import type { Type } from '@angular/core';

export interface ITenantLanding {
  /** Título de la pestaña. */
  title: string;
  load: () => Promise<Type<unknown>>;
}

/**
 * Instituciones con una landing propia, por subdominio. Las demás usan la portada de GEMS
 * (solo con sus colores). Para sumar una: un componente en public/tenants/<nombre> y su entrada aquí.
 */
export const TENANT_LANDINGS: Readonly<Record<string, ITenantLanding>> = {
  knowledgecraft: {
    title: 'Knowledge Craft · Juega, aprende y craftea',
    load: () => import('./public/tenants/knowledge-craft/kc-landing.component').then(m => m.KcLandingComponent),
  },
};

export const tenantLanding = (slug: string | null): ITenantLanding | null =>
  slug ? (TENANT_LANDINGS[slug] ?? null) : null;
