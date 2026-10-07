import { ChangeDetectionStrategy, Component, DOCUMENT, computed, effect, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { AuthSessionService } from 'auth/core';
import { GuestAccessService, isGuestUser } from './guest-access.service';
import { GuestGateService } from './guest-gate';

/**
 * Para quien estudia como invitado: una barra discreta «Guarda tu avance» y el formulario para
 * convertir su sesión en una cuenta, conservando todo lo que hizo.
 */
@Component({
  selector: 'gems-guest-save-bar',
  template: `
    @if (visible()) {
      <aside class="gsb" role="complementary" aria-label="Guardar tu avance">
        <span class="gsb__text"><strong>Estás como invitado.</strong><span class="gsb__more"> Crea tu cuenta para no perder tu avance ni tu racha.</span></span>
        <button type="button" class="gsb__btn" (click)="open.set(true)">Guardar mi avance</button>
        <button type="button" class="gsb__close" aria-label="Ocultar por ahora" (click)="hidden.set(true)">×</button>
      </aside>
    }

    @if (saved()) {
      <div class="gsb gsb--ok" role="status">¡Listo! Tu avance quedó guardado en tu cuenta.</div>
    }

    @if (open()) {
      <div class="gsm__backdrop" (click)="close()"></div>
      <div class="gsm" role="dialog" aria-modal="true" aria-labelledby="gsm-title">
        @if (gate.blocked(); as what) {
          <span class="gsm__lock">Necesitas una cuenta</span>
          <h2 id="gsm-title">Crea tu cuenta para ver {{ what }}</h2>
          <p>Tu curso sigue abierto como invitado. Con una cuenta gratis desbloqueas el resto de la plataforma y conservas todo lo que llevas.</p>
        } @else {
          <h2 id="gsm-title">Guarda tu avance</h2>
          <p>Tus lecciones, intentos y racha pasan a tu cuenta. Después entras con tu correo desde cualquier dispositivo.</p>
        }
        <form (submit)="$event.preventDefault(); save()">
          <div class="gsm__row">
            <label>Nombre<input name="fn" required maxlength="50" [value]="firstName" (input)="firstName = $any($event.target).value" /></label>
            <label>Apellido<input name="ln" required maxlength="50" [value]="lastName" (input)="lastName = $any($event.target).value" /></label>
          </div>
          <label>Correo<input name="em" type="email" required maxlength="160" [value]="email" (input)="email = $any($event.target).value" autocomplete="email" /></label>
          <label for="gsm-pw">Contraseña</label>
          <div class="gsm__pw">
            <input id="gsm-pw" name="pw" [type]="showPw() ? 'text' : 'password'" required minlength="8" [value]="password()"
                   (input)="password.set($any($event.target).value)" autocomplete="new-password" aria-describedby="gsm-rules" />
            <button type="button" class="gsm__eye" (click)="showPw.set(!showPw())" [attr.aria-pressed]="showPw()">{{ showPw() ? 'Ocultar' : 'Mostrar' }}</button>
          </div>
          <ul class="gsm__rules" id="gsm-rules" aria-label="Requisitos de la contraseña">
            @for (r of rules(); track r.label) { <li [class.ok]="r.ok">{{ r.label }}</li> }
          </ul>
          @if (error(); as e) { <p class="gsm__error" role="alert">{{ e }}</p> }
          <button type="submit" class="gsb__btn gsm__submit" [disabled]="busy()">{{ busy() ? 'Creando tu cuenta…' : 'Crear mi cuenta gratis' }}</button>
          <button type="button" class="gsm__skip" (click)="close()">{{ gate.blocked() ? 'Ahora no, seguir con mi curso' : 'Ahora no' }}</button>
        </form>
        <p class="gsm__alt">¿Ya tienes cuenta? <a href="/auth/signin">Inicia sesión</a></p>
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
    ::ng-deep body.gems-guest-bar edu-player-content-block { display: block; padding-bottom: 104px; }
    .gsm__backdrop { position: fixed; inset: 0; z-index: 1000; background: var(--color-fondo-overlay); }
    .gsm { position: fixed; z-index: 1001; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(460px, calc(100vw - 32px));
      max-height: calc(100vh - 32px); overflow: auto; padding: 24px; border-radius: 18px; background: var(--color-superficie);
      border: 1px solid var(--color-borde-secundario); box-shadow: var(--sombra-xl); }
    .gsm__lock { display: inline-block; margin-bottom: 8px; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--color-texto-acento); }
    .gsm__alt { margin: 14px 0 0 !important; padding-top: 14px; border-top: 1px solid var(--color-borde-principal); text-align: center; font-size: 13px; color: var(--color-texto-terciario); }
    .gsm__alt a { color: var(--color-texto-acento); font-weight: 700; }
    .gsm h2 { margin: 0 0 6px; font: 800 22px/1.2 var(--font-titulo); color: var(--color-texto-principal); }
    .gsm p { margin: 0 0 16px; font-size: var(--font-size-sm); color: var(--color-texto-secundario); }
    .gsm form { display: grid; gap: 12px; }
    .gsm label { display: grid; gap: 6px; font-size: var(--font-size-sm); color: var(--color-texto-secundario); }
    .gsm input { padding: 11px 13px; border-radius: 10px; border: 1px solid var(--color-borde-secundario); background: var(--color-fondo-sutil);
      color: var(--color-texto-principal); font: inherit; }
    .gsm input:focus { outline: none; border-color: var(--color-primario); box-shadow: 0 0 0 3px var(--color-primario-trans-20); }
    .gsm__pw { position: relative; display: flex; }
    .gsm__pw input { flex: 1; padding-right: 84px; }
    .gsm__eye { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); padding: 6px 10px; border: 0; border-radius: 8px;
      background: none; color: var(--color-texto-secundario); font: 600 12px/1 var(--font-texto); cursor: pointer; }
    .gsm__eye:hover { color: var(--color-texto-principal); background: var(--color-fondo-hover); }
    .gsm__rules { display: flex; flex-wrap: wrap; gap: 6px; margin: -4px 0 0; padding: 0; list-style: none; }
    .gsm__rules li { padding: 4px 9px; border-radius: 99px; font-size: 12px; color: var(--color-texto-terciario); background: var(--color-fondo-sutil);
      border: 1px solid var(--color-borde-principal); transition: color .15s, background .15s, border-color .15s; }
    .gsm__rules li.ok { color: var(--color-exito-texto); border-color: color-mix(in srgb, var(--color-exito) 45%, transparent);
      background: color-mix(in srgb, var(--color-exito) 12%, transparent); }
    .gsm__rules li.ok::before { content: '✓ '; }
    .gsm__submit { width: 100%; padding: 14px 16px; margin-top: 6px; font-size: var(--font-size-base); }
    .gsm__skip { justify-self: center; padding: 8px; border: 0; background: none; color: var(--color-texto-secundario);
      font: 600 var(--font-size-sm)/1 var(--font-texto); cursor: pointer; }
    .gsm__skip:hover { color: var(--color-texto-principal); text-decoration: underline; }
    .gsm__row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .gsm__error { margin: 0 !important; color: var(--color-error-texto) !important; }
    .gsm__actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px; }
    .gsm__ghost { padding: 10px 14px; border-radius: 10px; border: 1px solid var(--color-borde-secundario); background: none;
      color: var(--color-texto-principal); font: 600 var(--font-size-sm)/1 var(--font-texto); cursor: pointer; }
    button:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }
    @keyframes gsb-in { from { opacity: 0; transform: translate(-50%, 16px); } }
    @media (max-width: 640px) {
      .gsb { left: 10px; right: 10px; transform: none; max-width: none; gap: 8px; padding: 8px 8px 8px 14px;
        bottom: calc(env(safe-area-inset-bottom, 0px) + 66px); animation: none; }
      .gsb__text { flex: 1; min-width: 0; }
      .gsb__more { display: none; }
      .gsb__btn { padding: 10px 12px; }
      .gsm__row { grid-template-columns: 1fr; }
    }
    @media (prefers-reduced-motion: reduce) { .gsb { animation: none; } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuestSaveBarComponent {
  private readonly session = inject(AuthSessionService);
  private readonly guests = inject(GuestAccessService);
  private readonly router = inject(Router);
  protected readonly gate = inject(GuestGateService);

  constructor() {
    // Si el invitado intentó abrir una sección bloqueada, se le muestra la invitación a crear su cuenta.
    effect(() => { if (this.gate.blocked()) { this.error.set(null); this.open.set(true); } });
    // Mientras la barra está a la vista, el reproductor deja espacio abajo para que no tape ningún botón.
    const body = inject(DOCUMENT).body;
    effect(() => body?.classList.toggle('gems-guest-bar', this.visible()));
  }

  protected close(): void {
    this.open.set(false);
    this.gate.blocked.set(null);
  }

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
  protected readonly password = signal('');
  protected readonly showPw = signal(false);
  /** Requisitos que pide el registro, marcados en vivo mientras se escribe. */
  protected readonly rules = computed(() => {
    const p = this.password();
    return [
      { label: '8 caracteres', ok: p.length >= 8 },
      { label: 'Una mayúscula', ok: /[A-Z]/.test(p) },
      { label: 'Una minúscula', ok: /[a-z]/.test(p) },
      { label: 'Un número', ok: /\d/.test(p) },
      { label: 'Un símbolo: @ $ ! % * ? &', ok: /[@$!%*?&]/.test(p) },
    ];
  });

  protected async save(): Promise<void> {
    if (this.busy()) return;
    this.error.set(null);
    if (this.firstName.trim().length < 2 || this.lastName.trim().length < 2) { this.error.set('Escribe tu nombre y apellido.'); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(this.email.trim())) { this.error.set('Escribe un correo válido.'); return; }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(this.password())) {
      this.error.set('La contraseña necesita 8 caracteres, con mayúscula, minúscula, número y un símbolo (@$!%*?&).');
      return;
    }
    this.busy.set(true);
    try {
      await this.guests.claim({ firstName: this.firstName.trim(), lastName: this.lastName.trim(), email: this.email.trim(), password: this.password() });
      this.close();
      this.password.set('');
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
