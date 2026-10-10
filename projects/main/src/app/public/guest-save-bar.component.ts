import { ChangeDetectionStrategy, Component, DOCUMENT, computed, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { AuthSessionService } from 'auth/core';
import { isGuestUser } from './guest-access.service';
import { GuestClaimFormComponent } from './guest-claim-form.component';
import { GuestGateService } from './guest-gate';

const HIDDEN_KEY = 'gems-guest-bar-hidden';

function readHidden(): boolean {
  try { return sessionStorage.getItem(HIDDEN_KEY) === '1'; } catch { return false; }
}

/**
 * Para quien estudia como invitado: una barra discreta «Guarda tu avance» y el formulario para
 * convertir su sesión en una cuenta, conservando todo lo que hizo.
 */
@Component({
  selector: 'gems-guest-save-bar',
  imports: [GuestClaimFormComponent],
  template: `
    @if (visible()) {
      <aside class="gsb" role="complementary" aria-label="Guardar tu avance">
        <span class="gsb__text"><strong>Estás como invitado.</strong><span class="gsb__more"> Crea tu cuenta para no perder tu avance ni tu racha.</span></span>
        <button type="button" class="gsb__btn" (click)="open.set(true)">Guardar mi avance</button>
        <button type="button" class="gsb__close" aria-label="Ocultar por ahora" (click)="hide()">×</button>
      </aside>
    }

    @if (saved()) {
      <div class="gsb gsb--ok" role="status">¡Listo! Tu avance quedó guardado en tu cuenta.</div>
    }

    @if (open()) {
      <!-- El formulario se descarga solo al abrirlo: no pesa en la carga inicial. -->
      @defer (on immediate) {
        <gems-guest-claim-form (closed)="close()" (saved)="onSaved()" />
      }
    }
  `,
  styles: [`
    .gsb { position: fixed; left: 50%; bottom: calc(env(safe-area-inset-bottom, 0px) + 18px); transform: translateX(-50%); z-index: 900;
      display: flex; align-items: center; gap: 14px; width: max-content; max-width: min(760px, calc(100vw - 32px)); padding: 10px 10px 10px 18px;
      border-radius: 14px; background: var(--color-superficie-alta); border: 1px solid var(--color-borde-secundario); box-shadow: var(--sombra-xl);
      font-size: var(--font-size-sm); color: var(--color-texto-secundario); animation: gsb-in .35s cubic-bezier(.16,1,.3,1); }
    .gsb--ok { padding: 14px 18px; color: var(--color-exito-texto); font-weight: 700; }
    .gsb__text strong { color: var(--color-texto-principal); }
    .gsb__btn { flex-shrink: 0; min-height: 44px; padding: 10px 16px; border: 0; border-radius: 10px; font: 700 var(--font-size-sm)/1 var(--font-texto);
      background: var(--color-primario-accion); color: var(--color-sobre-primario); cursor: pointer; }
    .gsb__btn:disabled { opacity: .6; cursor: progress; }
    .gsb__close { flex-shrink: 0; width: 44px; height: 44px; border: 0; border-radius: 8px; background: none; color: var(--color-texto-terciario); font-size: 18px; cursor: pointer; }
    .gsb__close:hover { background: var(--color-fondo-hover); }
    ::ng-deep body.gems-guest-bar edu-player-content-block { display: block; padding-bottom: 104px; }
    ::ng-deep body.gems-guest-bar .slayout__inner:not(.slayout__inner--bleed) { padding-bottom: 104px; }
    button:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }
    @keyframes gsb-in { from { opacity: 0; transform: translate(-50%, 16px); } }
    @media (max-width: 640px) {
      .gsb { left: 10px; right: 10px; transform: none; width: auto; max-width: none; gap: 8px; padding: 8px 8px 8px 14px;
        bottom: calc(env(safe-area-inset-bottom, 0px) + 66px); animation: none; }
      .gsb__text { flex: 1; min-width: 0; }
      .gsb__more { display: none; }
      .gsb__btn { padding: 10px 12px; }
    }
    @media (max-width: 380px) {
      .gsb__text { display: none; }
      .gsb__btn { flex: 1; }
    }
    @media (prefers-reduced-motion: reduce) { .gsb { animation: none; } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuestSaveBarComponent {
  private readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);
  protected readonly gate = inject(GuestGateService);

  constructor() {
    // Si el invitado intentó abrir una sección bloqueada, se le muestra la invitación a crear su cuenta.
    effect(() => { if (this.gate.blocked()) this.open.set(true); });
    // Mientras la barra está a la vista, el reproductor deja espacio abajo para que no tape ningún botón.
    const body = inject(DOCUMENT).body;
    effect(() => body?.classList.toggle('gems-guest-bar', this.visible()));
  }

  protected hide(): void {
    this.hidden.set(true);
    try { sessionStorage.setItem(HIDDEN_KEY, '1'); } catch { return; }
  }

  protected close(): void {
    this.open.set(false);
    this.gate.blocked.set(null);
  }

  private readonly url = toSignal(this.router.events.pipe(
    filter(e => e instanceof NavigationEnd), map(e => (e as NavigationEnd).urlAfterRedirects)), { initialValue: this.router.url });

  protected readonly hidden = signal(readHidden());
  protected readonly open = signal(false);
  protected readonly saved = signal(false);
  protected readonly visible = computed(() =>
    isGuestUser(this.session.user()) && this.url().startsWith('/learn') && !this.hidden() && !this.open());

  protected onSaved(): void {
    this.close();
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 5000);
    // Confeti solo en el navegador y cargado bajo demanda (no pesa en la carga inicial).
    if (typeof window !== 'undefined' && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      import('canvas-confetti').then(m => m.default({ particleCount: 90, spread: 70, origin: { y: 0.7 } })).catch(() => undefined);
    }
  }
}
