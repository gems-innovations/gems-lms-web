import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TenantHomeComponent } from 'shared';
import { TenantService } from '../tenant.service';
import { coursesHtml, fillPlaceholders } from '../tenant-courses';

/**
 * Home de una institución (su subdominio).
 *
 * - BASE: cabecera, portada y cursos de la institución con su marca; su CSS la restilizan y su HTML, si lo hay,
 *   se muestra como banner bajo la cabecera.
 * - CUSTOM: su HTML reemplaza todo. Marcadores: {{cursos}}, {{nombre}}, {{logo}} e {{ingresar}}.
 *
 * Clases estables para el CSS de la institución: .tb-header, .tb-brand, .tb-logo, .tb-name, .tb-login, .tb-hero,
 * .tb-cta, .tb-courses, .tb-footer y las tarjetas .gems-cursos / .gems-curso (sus partes: __img, __body, __title,
 * __desc, __meta). Los estilos por defecto usan :where(), sin especificidad, para que cualquier CSS los supere.
 */
@Component({
  selector: 'gems-tenant-home-page',
  imports: [TenantHomeComponent, RouterLink],
  templateUrl: './tenant-home.page.html',
  styleUrl: './tenant-home.page.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TenantHomePage {
  protected readonly tenant = inject(TenantService);

  protected readonly home = computed(() => this.tenant.home()!);
  protected readonly custom = computed(() => this.home().mode === 'CUSTOM' && !!this.home().html);
  protected readonly logoUrl = computed(() => this.home().branding?.logoUrl ?? null);
  protected readonly courses = computed(() => coursesHtml(this.tenant.courses()));
  protected readonly customHtml = computed(() => fillPlaceholders(this.home().html ?? '', {
    name: this.home().name, logoUrl: this.logoUrl(), courses: this.tenant.courses(),
  }));
}
