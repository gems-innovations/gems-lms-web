import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, computed, inject, output, signal, viewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { GuestAccessService } from './guest-access.service';
import { GuestGateService } from './guest-gate';
import { AnalyticsService } from '../analytics.service';

/**
 * Formulario para que el invitado cree su cuenta y conserve su avance. Se carga solo cuando se abre
 * (`@defer` en la barra de invitado), así no pesa en la carga inicial de la app.
 *
 * Autorizaciones (Ley 1581 de 2012): la política de datos es obligatoria y queda registrada; los
 * recordatorios por correo son opcionales y vienen desmarcados.
 */
@Component({
  selector: 'gems-guest-claim-form',
  template: `
    <div class="gsm__backdrop" (click)="closed.emit()"></div>
    <div #dialog class="gsm" role="dialog" aria-modal="true" aria-labelledby="gsm-title" tabindex="-1" (keydown.escape)="closed.emit()">
      @if (gate.blocked(); as what) {
        <span class="gsm__lock">Necesitas una cuenta</span>
        <h2 id="gsm-title">Crea tu cuenta para ver {{ what }}</h2>
        <p>Es gratis, y conservas todo lo que llevas.</p>
      } @else {
        <h2 id="gsm-title">Guarda tu avance</h2>
        <p>Tu avance y tu racha pasan a tu cuenta.</p>
      }
      <form (submit)="$event.preventDefault(); save()">
        <div class="gsm__row">
          <label>Nombre<input name="fn" required maxlength="50" autocomplete="given-name" enterkeyhint="next" [value]="firstName" (input)="firstName = $any($event.target).value" /></label>
          <label>Apellido<input name="ln" required maxlength="50" autocomplete="family-name" enterkeyhint="next" [value]="lastName" (input)="lastName = $any($event.target).value" /></label>
        </div>
        <label>Correo<input name="em" type="email" inputmode="email" enterkeyhint="next" required maxlength="160" [value]="email" (input)="email = $any($event.target).value" autocomplete="email" /></label>
        <label for="gsm-pw">Contraseña</label>
        <div class="gsm__pw">
          <input id="gsm-pw" name="pw" [type]="showPw() ? 'text' : 'password'" required minlength="8" [value]="password()"
                 (input)="password.set($any($event.target).value)" autocomplete="new-password" aria-describedby="gsm-rules" />
          <button type="button" class="gsm__eye" (click)="showPw.set(!showPw())" [attr.aria-pressed]="showPw()">{{ showPw() ? 'Ocultar' : 'Mostrar' }}</button>
        </div>
        @if (password().length > 0 && !rulesOk()) {
          <ul class="gsm__rules" id="gsm-rules" aria-label="Requisitos de la contraseña">
            @for (r of rules(); track r.label) { <li [class.ok]="r.ok">{{ r.label }}</li> }
          </ul>
        }
        <label class="gsm__check">
          <input type="checkbox" name="policy" [checked]="acceptPolicy()" (change)="acceptPolicy.set($any($event.target).checked)" />
          <span>Acepto la <a href="/privacidad" target="_blank" rel="noopener">política de privacidad</a> y los <a href="/terminos" target="_blank" rel="noopener">términos</a>. Si soy menor, cuento con permiso de mi acudiente.</span>
        </label>
        <label class="gsm__check">
          <input type="checkbox" name="tips" [checked]="acceptTips()" (change)="acceptTips.set($any($event.target).checked)" />
          <span>Quiero recordatorios para seguir estudiando <em>(opcional, máx. 1 por semana)</em></span>
        </label>
        @if (error(); as e) { <p class="gsm__error" role="alert">{{ e }}</p> }
        <button type="submit" class="gsm__submit" [disabled]="busy()">{{ busy() ? 'Creando tu cuenta…' : 'Crear mi cuenta gratis' }}</button>
        <button type="button" class="gsm__skip" (click)="closed.emit()">{{ gate.blocked() ? 'Ahora no, seguir con mi curso' : 'Ahora no' }}</button>
      </form>
      <p class="gsm__alt">¿Ya tienes cuenta? <a href="/auth/signin">Inicia sesión</a></p>
    </div>
  `,
  styles: [`
    .gsm__backdrop { position: fixed; inset: 0; z-index: 1000; background: var(--color-fondo-overlay); }
    .gsm { position: fixed; z-index: 1001; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(460px, calc(100vw - 32px));
      max-height: calc(100vh - 32px); max-height: calc(100dvh - 32px); overflow: auto; overscroll-behavior: contain; padding: 20px 22px; border-radius: 18px; background: var(--color-superficie);
      border: 1px solid var(--color-borde-secundario); box-shadow: var(--sombra-xl); }
    .gsm__lock { display: inline-block; margin-bottom: 8px; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--color-texto-acento); }
    .gsm__alt { margin: 8px 0 0 !important; padding-top: 10px; border-top: 1px solid var(--color-borde-principal); text-align: center; font-size: 13px; color: var(--color-texto-terciario); }
    .gsm a { color: var(--color-texto-acento); font-weight: 700; }
    .gsm h2 { margin: 0 0 4px; font: 800 20px/1.2 var(--font-titulo); color: var(--color-texto-principal); }
    .gsm p { margin: 0 0 12px; font-size: var(--font-size-sm); color: var(--color-texto-secundario); }
    .gsm form { display: grid; gap: 10px; }
    .gsm label { display: grid; gap: 4px; font-size: var(--font-size-sm); color: var(--color-texto-secundario); }
    .gsm input:not([type=checkbox]) { min-height: 48px; padding: 9px 12px; font-size: 16px; border-radius: 10px; border: 1px solid var(--color-borde-secundario); background: var(--color-fondo-sutil);
      color: var(--color-texto-principal); font: inherit; }
    .gsm input:focus { outline: none; border-color: var(--color-primario); box-shadow: 0 0 0 3px var(--color-primario-trans-20); }
    .gsm .gsm__check { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; line-height: 1.45; cursor: pointer; }
    .gsm__check input { flex-shrink: 0; width: 18px; height: 18px; margin-top: 1px; accent-color: var(--color-primario); }
    .gsm__check em { color: var(--color-texto-terciario); font-style: normal; }
    .gsm__pw { position: relative; display: flex; }
    .gsm__pw input { flex: 1; padding-right: 84px; }
    .gsm__eye { position: absolute; right: 2px; top: 50%; transform: translateY(-50%); min-width: 44px; min-height: 44px; padding: 6px 10px; border: 0; border-radius: 8px;
      background: none; color: var(--color-texto-secundario); font: 600 12px/1 var(--font-texto); cursor: pointer; }
    .gsm__eye:hover { color: var(--color-texto-principal); background: var(--color-fondo-hover); }
    .gsm__rules { display: flex; flex-wrap: wrap; gap: 6px; margin: -4px 0 0; padding: 0; list-style: none; }
    .gsm__rules li { padding: 4px 9px; border-radius: 99px; font-size: 12px; color: var(--color-texto-terciario); background: var(--color-fondo-sutil);
      border: 1px solid var(--color-borde-principal); transition: color .15s, background .15s, border-color .15s; }
    .gsm__rules li.ok { color: var(--color-exito-texto); border-color: color-mix(in srgb, var(--color-exito) 45%, transparent);
      background: color-mix(in srgb, var(--color-exito) 12%, transparent); }
    .gsm__rules li.ok::before { content: '✓ '; }
    .gsm__submit { width: 100%; min-height: 44px; padding: 12px 16px; margin-top: 2px; border: 0; border-radius: 10px; font: 700 var(--font-size-base)/1 var(--font-texto);
      background: var(--color-primario-accion); color: var(--color-sobre-primario); cursor: pointer; }
    .gsm__submit:disabled { opacity: .6; cursor: progress; }
    .gsm__skip { justify-self: center; min-height: 44px; padding: 4px 12px; border: 0; background: none; color: var(--color-texto-secundario);
      font: 600 var(--font-size-sm)/1 var(--font-texto); cursor: pointer; }
    .gsm__skip:hover { color: var(--color-texto-principal); text-decoration: underline; }
    .gsm__row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .gsm__error { margin: 0 !important; color: var(--color-error-texto) !important; }
    button:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }
    .gsm:focus { outline: none; }
    @media (max-width: 640px) {
      .gsm__row { grid-template-columns: 1fr; }
      .gsm { left: 0; right: 0; top: auto; bottom: 0; transform: none; width: auto; max-height: 92vh; max-height: 92dvh;
        padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 20px); border-radius: 18px 18px 0 0; border-bottom: 0; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuestClaimFormComponent implements AfterViewInit {
  private readonly guests = inject(GuestAccessService);
  private readonly analytics = inject(AnalyticsService);
  protected readonly gate = inject(GuestGateService);

  private readonly dialog = viewChild.required<ElementRef<HTMLElement>>('dialog');

  readonly closed = output<void>();
  readonly saved = output<void>();

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected firstName = '';
  protected lastName = '';
  protected email = '';
  protected readonly password = signal('');
  protected readonly showPw = signal(false);
  protected readonly acceptPolicy = signal(false);
  protected readonly acceptTips = signal(false);
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

  protected readonly rulesOk = computed(() => this.rules().every(r => r.ok));

  ngAfterViewInit(): void {
    this.dialog().nativeElement.focus();
  }

  protected async save(): Promise<void> {
    if (this.busy()) return;
    this.error.set(null);
    if (this.firstName.trim().length < 2 || this.lastName.trim().length < 2) { this.error.set('Escribe tu nombre y apellido.'); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(this.email.trim())) { this.error.set('Escribe un correo válido.'); return; }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(this.password())) {
      this.error.set('La contraseña necesita 8 caracteres, con mayúscula, minúscula, número y un símbolo (@$!%*?&).');
      return;
    }
    if (!this.acceptPolicy()) { this.error.set('Para crear tu cuenta necesitas aceptar la política de privacidad y los términos.'); return; }
    this.busy.set(true);
    try {
      await this.guests.claim({ firstName: this.firstName.trim(), lastName: this.lastName.trim(), email: this.email.trim(),
        password: this.password(), acceptDataPolicy: true, acceptTips: this.acceptTips() });
      this.password.set('');
      this.analytics.event('cuenta-creada');
      this.saved.emit();
    } catch (e) {
      this.error.set(e instanceof HttpErrorResponse && e.status === 409
        ? 'Ya existe una cuenta con ese correo. Inicia sesión con ella o usa otro correo.'
        : 'No pudimos crear tu cuenta. Revisa los datos e inténtalo de nuevo.');
    } finally {
      this.busy.set(false);
    }
  }
}
