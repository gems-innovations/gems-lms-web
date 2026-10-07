import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { AuthSessionService } from 'auth/core';
import { GuestAccessService, isGuestUser } from './guest-access.service';

/**
 * Para quien estudia como invitado: una barra discreta «Guarda tu avance» y el formulario para
 * convertir su sesión en una cuenta, conservando todo lo que hizo.
 */
@Component({
  selector: 'gems-guest-save-bar',
  template: `
    @if (visible()) {
      <aside class="gsb" role="complementary" aria-label="Guardar tu avance">
        <span class="gsb__text"><strong>Estás estudiando como invitado.</strong> Crea tu cuenta para no perder tu avance ni tu racha.</span>
        <button type="button" class="gsb__btn" (click)="open.set(true)">Guardar mi avance</button>
        <button type="button" class="gsb__close" aria-label="Ocultar por ahora" (click)="hidden.set(true)">×</button>
      </aside>
    }

    @if (saved()) {
      <div class="gsb gsb--ok" role="status">¡Listo! Tu avance quedó guardado en tu cuenta.</div>
    }

    @if (open()) {
      <div class="gsm__backdrop" (click)="open.set(false)"></div>
      <div class="gsm" role="dialog" aria-modal="true" aria-labelledby="gsm-title">
        <h2 id="gsm-title">Guarda tu avance</h2>
        <p>Tus lecciones, intentos y racha pasan a tu cuenta. Después entras con tu correo desde cualquier dispositivo.</p>
        <form (submit)="$event.preventDefault(); save()">
          <div class="gsm__row">
            <label>Nombre<input name="fn" required maxlength="50" [value]="firstName" (input)="firstName = $any($event.target).value" /></label>
            <label>Apellido<input name="ln" required maxlength="50" [value]="lastName" (input)="lastName = $any($event.target).value" /></label>
          </div>
          <label>Correo<input name="em" type="email" required maxlength="160" [value]="email" (input)="email = $any($event.target).value" autocomplete="email" /></label>
          <label>Contraseña<input name="pw" type="password" required minlength="8" [value]="password" (input)="password = $any($event.target).value" autocomplete="new-password" /></label>
          <small>Mínimo 8 caracteres, con mayúscula, minúscula, número y un símbolo (&#64;$!%*?&amp;).</small>
          @if (error(); as e) { <p class="gsm__error" role="alert">{{ e }}</p> }
          <div class="gsm__actions">
            <button type="button" class="gsm__ghost" (click)="open.set(false)">Ahora no</button>
            <button type="submit" class="gsb__btn" [disabled]="busy()">{{ busy() ? 'Guardando…' : 'Crear mi cuenta' }}</button>
          </div>
        </form>
      </div>
    }
  `,
  styles: [`
    .gsb { position: fixed; left: 50%; bottom: calc(env(safe-area-inset-bottom, 0px) + 18px); transform: translateX(-50%); z-index: 900;
      display: flex; align-items: center; gap: 14px; max-width: min(760px, calc(100vw - 32px)); padding: 10px 10px 10px 18px;
      border-radius: 14px; background: var(--color-superficie-alta); border: 1px solid var(--color-borde-secundario); box-shadow: var(--sombra-xl);
      font-size: var(--font-size-sm); color: var(--color-texto-secundario); animation: gsb-in .35s cubic-bezier(.16,1,.3,1); }
    .gsb--ok { padding: 14px 18px; color: var(--color-exito-texto); font-weight: 700; }
    .gsb__text strong { color: var(--color-texto-principal); }
    .gsb__btn { flex-shrink: 0; padding: 10px 16px; border: 0; border-radius: 10px; font: 700 var(--font-size-sm)/1 var(--font-texto);
      background: var(--color-primario-accion); color: var(--color-sobre-primario); cursor: pointer; }
    .gsb__btn:disabled { opacity: .6; cursor: progress; }
    .gsb__close { flex-shrink: 0; width: 30px; height: 30px; border: 0; border-radius: 8px; background: none; color: var(--color-texto-terciario); font-size: 18px; cursor: pointer; }
    .gsb__close:hover { background: var(--color-fondo-hover); }
    .gsm__backdrop { position: fixed; inset: 0; z-index: 1000; background: var(--color-fondo-overlay); }
    .gsm { position: fixed; z-index: 1001; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(460px, calc(100vw - 32px));
      max-height: calc(100vh - 32px); overflow: auto; padding: 24px; border-radius: 18px; background: var(--color-superficie);
      border: 1px solid var(--color-borde-secundario); box-shadow: var(--sombra-xl); }
    .gsm h2 { margin: 0 0 6px; font: 800 22px/1.2 var(--font-titulo); color: var(--color-texto-principal); }
    .gsm p { margin: 0 0 16px; font-size: var(--font-size-sm); color: var(--color-texto-secundario); }
    .gsm form { display: grid; gap: 12px; }
    .gsm label { display: grid; gap: 6px; font-size: var(--font-size-sm); color: var(--color-texto-secundario); }
    .gsm input { padding: 11px 13px; border-radius: 10px; border: 1px solid var(--color-borde-secundario); background: var(--color-fondo-sutil);
      color: var(--color-texto-principal); font: inherit; }
    .gsm input:focus { outline: none; border-color: var(--color-primario); box-shadow: 0 0 0 3px var(--color-primario-trans-20); }
    .gsm small { color: var(--color-texto-terciario); font-size: 12px; }
    .gsm__row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .gsm__error { margin: 0 !important; color: var(--color-error-texto) !important; }
    .gsm__actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px; }
    .gsm__ghost { padding: 10px 14px; border-radius: 10px; border: 1px solid var(--color-borde-secundario); background: none;
      color: var(--color-texto-principal); font: 600 var(--font-size-sm)/1 var(--font-texto); cursor: pointer; }
    button:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }
    @keyframes gsb-in { from { opacity: 0; transform: translate(-50%, 16px); } }
    @media (max-width: 560px) { .gsb { flex-wrap: wrap; } .gsb__text { flex-basis: 100%; } .gsm__row { grid-template-columns: 1fr; } }
    @media (prefers-reduced-motion: reduce) { .gsb { animation: none; } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuestSaveBarComponent {
  private readonly session = inject(AuthSessionService);
  private readonly guests = inject(GuestAccessService);
  private readonly router = inject(Router);

  private readonly url = toSignal(this.router.events.pipe(
    filter(e => e instanceof NavigationEnd), map(e => (e as NavigationEnd).urlAfterRedirects)), { initialValue: this.router.url });

  protected readonly hidden = signal(false);
  protected readonly open = signal(false);
  protected readonly busy = signal(false);
  protected readonly saved = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly visible = computed(() =>
    isGuestUser(this.session.user()) && this.url().startsWith('/learn') && !this.hidden() && !this.open());

  protected firstName = '';
  protected lastName = '';
  protected email = '';
  protected password = '';

  protected async save(): Promise<void> {
    if (this.busy()) return;
    this.error.set(null);
    if (this.firstName.trim().length < 2 || this.lastName.trim().length < 2) { this.error.set('Escribe tu nombre y apellido.'); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(this.email.trim())) { this.error.set('Escribe un correo válido.'); return; }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(this.password)) {
      this.error.set('La contraseña necesita 8 caracteres, con mayúscula, minúscula, número y un símbolo (@$!%*?&).');
      return;
    }
    this.busy.set(true);
    try {
      await this.guests.claim({ firstName: this.firstName.trim(), lastName: this.lastName.trim(), email: this.email.trim(), password: this.password });
      this.open.set(false);
      this.password = '';
      this.saved.set(true);
      setTimeout(() => this.saved.set(false), 5000);
      // Confeti solo en el navegador y cargado bajo demanda (no pesa en la carga inicial).
      if (typeof window !== 'undefined' && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        import('canvas-confetti').then(m => m.default({ particleCount: 90, spread: 70, origin: { y: 0.7 } })).catch(() => undefined);
      }
    } catch (e) {
      this.error.set(e instanceof HttpErrorResponse && e.status === 409
        ? 'Ya existe una cuenta con ese correo. Inicia sesión con ella o usa otro correo.'
        : 'No pudimos crear tu cuenta. Revisa los datos e inténtalo de nuevo.');
    } finally {
      this.busy.set(false);
    }
  }
}
