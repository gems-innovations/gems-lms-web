import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { scopeCss } from '../../../utils/scope-css';

let instances = 0;

/**
 * Contenedor de la home de una institución. Pinta su HTML (sin JavaScript) y le aplica su CSS acotado a este
 * contenedor, de modo que sus estilos no afecten al resto de la aplicación. Admite contenido proyectado:
 * `[slot=top]` va antes del HTML y el resto, después.
 *
 * El HTML pasa por el sanitizador de Angular además del que ya aplicó el back.
 */
@Component({
  selector: 'gems-tenant-home',
  template: `
    <ng-content select="[slot=top]" />
    @if (html()) { <div class="tenant-home__content" [innerHTML]="html()"></div> }
    <ng-content />
  `,
  styles: `:host { display: block; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'scopeClass' },
})
export class TenantHomeComponent {
  readonly html = input<string | null | undefined>('');
  readonly css = input<string | null | undefined>('');

  private readonly document = inject(DOCUMENT);
  protected readonly scopeClass = `tenant-home-${++instances}`;
  private styleElement: HTMLStyleElement | null = null;

  constructor() {
    effect(() => {
      const scoped = scopeCss(this.css(), `.${this.scopeClass}`);
      if (!scoped) { this.removeStyle(); return; }
      if (!this.styleElement) {
        this.styleElement = this.document.createElement('style');
        this.styleElement.setAttribute('data-tenant-home', this.scopeClass);
        this.document.head.appendChild(this.styleElement);
      }
      this.styleElement.textContent = scoped;
    });
    inject(DestroyRef).onDestroy(() => this.removeStyle());
  }

  private removeStyle(): void {
    this.styleElement?.remove();
    this.styleElement = null;
  }
}
