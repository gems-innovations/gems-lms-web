import { afterNextRender, ChangeDetectionStrategy, Component, effect, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { GoogleAuthService } from './google-auth.service';

/**
 * Botón «Continuar con Google» con el aviso de privacidad debajo. No dibuja nada si Google no está
 * configurado (sin `GOOGLE_CLIENT_ID`) o no cargó; el formulario de correo queda como siempre.
 */
@Component({
  selector: 'gems-google-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <div class="gbtn">
        <div #host class="gbtn__host" [class.gbtn__host--off]="disabled()"></div>
        <p class="gbtn__note">Al continuar aceptas la <a href="/privacidad" target="_blank" rel="noopener">política de privacidad</a> y los <a href="/terminos" target="_blank" rel="noopener">términos</a>. Si eres menor, cuentas con permiso de tu acudiente.</p>
        @if (divider()) { <p class="gbtn__or"><span>o con tu correo</span></p> }
      </div>
    }
  `,
  styles: [`
    .gbtn { display: grid; gap: 10px; width: 100%; }
    .gbtn__host { display: flex; justify-content: center; min-height: 44px; }
    .gbtn__host--off { opacity: .55; pointer-events: none; }
    .gbtn__note { margin: 0; font-size: 12px; line-height: 1.45; text-align: center; color: var(--color-texto-terciario); }
    .gbtn__note a { color: var(--color-texto-acento); font-weight: 700; }
    .gbtn__or { display: flex; align-items: center; gap: 10px; margin: 2px 0 0; font-size: 12px; color: var(--color-texto-terciario); }
    .gbtn__or::before, .gbtn__or::after { content: ''; flex: 1; height: 1px; background: var(--color-borde-principal); }
  `],
})
export class GoogleButtonComponent {
  private readonly google = inject(GoogleAuthService);
  private readonly host = viewChild<ElementRef<HTMLElement>>('host');

  readonly disabled = input(false);
  /** Muestra «o con tu correo» debajo, para separarlo del formulario. */
  readonly divider = input(true);
  readonly credential = output<string>();

  protected readonly visible = signal(false);

  constructor() {
    afterNextRender(() => { if (this.google.available) this.visible.set(true); });
    effect(() => {
      const el = this.host()?.nativeElement;
      if (!el) return;
      void this.google.renderButton(el, c => this.credential.emit(c)).then(ok => { if (!ok) this.visible.set(false); });
    });
  }
}
