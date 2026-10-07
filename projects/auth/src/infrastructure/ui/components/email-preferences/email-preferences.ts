import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ToastService } from 'shared';
import { IEmailPreferences, UserService } from '../../../services/user.service';

/** Profile card: whether the e-mail is confirmed (with "send again") and which e-mails the user wants. */
@Component({
  selector: 'auth-email-preferences',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: grid; gap: 1rem; padding: clamp(1.25rem, 3vw, 2rem); border: 1px solid var(--color-borde-secundario); border-radius: 18px; background: var(--color-superficie); }
    h2 { margin: 0; color: var(--color-texto-principal); font-size: 1.08rem; }
    p { margin: 0; color: var(--color-texto-secundario); }
    .status { display: flex; flex-wrap: wrap; align-items: center; gap: .75rem; }
    .badge { padding: .2rem .65rem; border-radius: 999px; font-size: .85rem; font-weight: 600; }
    .badge--ok { background: color-mix(in srgb, var(--color-exito, #16a34a) 15%, transparent); color: var(--color-exito, #16a34a); }
    .badge--warn { background: color-mix(in srgb, var(--color-advertencia, #d97706) 15%, transparent); color: var(--color-advertencia, #d97706); }
    button { min-height: 38px; padding: 0 .9rem; border: 1px solid var(--color-borde-principal); border-radius: 10px; background: transparent; color: var(--color-texto-principal); font: inherit; font-weight: 600; cursor: pointer; }
    button:hover:not(:disabled) { background: var(--color-tarjeta-hover); }
    button:disabled { opacity: .7; cursor: default; }
    label { display: flex; gap: .7rem; align-items: flex-start; cursor: pointer; color: var(--color-texto-principal); }
    label input { width: 1.05rem; height: 1.05rem; margin-top: .2rem; min-height: auto; accent-color: var(--color-primario); }
    small { display: block; color: var(--color-texto-secundario); }
  `],
  template: `
    <h2 id="mail-title">Correo</h2>
    @if (prefs(); as p) {
      <div class="status">
        @if (p.emailVerified) {
          <span class="badge badge--ok">Correo confirmado</span>
        } @else {
          <span class="badge badge--warn">Correo sin confirmar</span>
          <button type="button" (click)="resend()" [disabled]="sending() || sent()">
            {{ sent() ? 'Enviado, revisa tu correo' : 'Reenviar confirmación' }}
          </button>
        }
      </div>
      <label>
        <input type="checkbox" [checked]="p.courseNotices" (change)="save({ courseNotices: $any($event.target).checked })" />
        <span>Avisos de mis cursos<small>Tareas calificadas, anuncios y respuestas en el foro.</small></span>
      </label>
      <label>
        <input type="checkbox" [checked]="p.tips" (change)="save({ tips: $any($event.target).checked })" />
        <span>Recordatorios e ideas<small>Como mucho uno por semana, para ayudarte a seguir con tu meta.</small></span>
      </label>
    } @else {
      <p>Cargando…</p>
    }
  `
})
export class EmailPreferencesComponent implements OnInit {
  private readonly users = inject(UserService);
  private readonly toast = inject(ToastService);

  protected readonly prefs = signal<IEmailPreferences | null>(null);
  protected readonly sending = signal(false);
  protected readonly sent = signal(false);

  ngOnInit(): void {
    this.users.getEmailPreferences().subscribe({ next: p => this.prefs.set(p), error: () => this.prefs.set(null) });
  }

  protected save(change: Partial<Pick<IEmailPreferences, 'courseNotices' | 'tips'>>): void {
    const current = this.prefs();
    if (!current) return;
    const next = { courseNotices: current.courseNotices, tips: current.tips, ...change };
    this.users.updateEmailPreferences(next).subscribe({
      next: p => { this.prefs.set(p); this.toast.success('Preferencias de correo guardadas'); },
      error: () => { this.prefs.set({ ...current }); this.toast.error('No pudimos guardar tus preferencias'); }
    });
  }

  protected resend(): void {
    this.sending.set(true);
    this.users.resendEmailVerification().subscribe({
      next: () => { this.sent.set(true); this.sending.set(false); },
      error: () => { this.sending.set(false); this.toast.error('No pudimos reenviar el correo'); }
    });
  }
}
