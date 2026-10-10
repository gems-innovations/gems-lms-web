import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { environment } from 'shared/core';
import { PublicHeaderComponent } from './public-header.component';
import { PublicFooterComponent } from './public-footer.component';

interface IPrefs { courseNotices: boolean; tips: boolean; }
type TState = 'loading' | 'ready' | 'saved' | 'invalid' | 'error';

/**
 * Opened from the link at the bottom of every GEMS e-mail (`?t=` signed token): change or stop the
 * e-mails without signing in.
 */
@Component({
  selector: 'gems-email-preferences-page',
  imports: [RouterLink, PublicHeaderComponent, PublicFooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './public.scss',
  styles: [`
    .mail-prefs { max-width: 560px; }
    .back { display: inline-flex; align-items: center; min-height: 44px; margin-top: 12px; color: var(--color-texto-secundario); text-decoration: none; font-size: var(--font-size-sm); }
    h1 { margin: 12px 0 8px; font: 800 clamp(26px, 4vw, 38px)/1.15 var(--font-titulo); text-wrap: balance; }
    p { margin: 10px 0 0; line-height: 1.6; color: var(--color-texto-secundario); }
    strong { color: var(--color-texto-principal); }
    .mail-prefs label { display: flex; gap: .75rem; align-items: flex-start; padding: 1rem 0; border-bottom: 1px solid var(--color-borde-secundario); cursor: pointer; }
    .mail-prefs input { flex: none; width: 1.4rem; height: 1.4rem; margin-top: .1rem; accent-color: var(--color-primario); }
    .mail-prefs small { display: block; color: var(--color-texto-secundario); }
    .mail-prefs .actions { display: flex; flex-wrap: wrap; gap: .75rem; margin-top: 1.25rem; }
    .mail-prefs button, .mail-prefs .cta { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 0 1.25rem; border-radius: 10px; font: inherit; font-weight: 600; text-decoration: none; cursor: pointer; }
    .mail-prefs button:focus-visible, .mail-prefs .cta:focus-visible, .mail-prefs input:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }
    .mail-prefs .primary { border: 0; background: var(--color-primario-accion); color: var(--color-sobre-primario); }
    .mail-prefs .ghost { border: 1px solid var(--color-borde-principal); background: transparent; color: inherit; }
    .mail-prefs .note { margin-top: 1rem; padding: .85rem 1rem; border-radius: 10px; background: var(--color-fondo-sutil); border: 1px solid var(--color-borde-principal); }
    @media (max-width: 480px) { .mail-prefs .actions button { flex: 1 1 100%; } }
  `],
  template: `
    <gems-public-header />
    <main class="pub mail-prefs">
      <a class="back" routerLink="/">← Volver al inicio</a>
      <h1>Tus correos de GEMS</h1>

      @switch (state()) {
        @case ('loading') { <p role="status">Cargando tus preferencias…</p> }
        @case ('invalid') {
          <p class="note" role="alert">Este enlace no es válido. Abre el enlace completo desde el último correo que te enviamos, o cambia tus preferencias en tu perfil.</p>
          <div class="actions">
            <a class="cta primary" routerLink="/auth/signin">Entrar a mi cuenta</a>
          </div>
        }
        @default {
          <p>Elige qué correos quieres recibir. Los avisos siguen apareciendo en la campanita de la app.</p>
          <label>
            <input type="checkbox" [checked]="prefs().courseNotices" (change)="set('courseNotices', $any($event.target).checked)" />
            <span><strong>Avisos de mis cursos</strong><small>Tareas calificadas, anuncios y respuestas en el foro.</small></span>
          </label>
          <label>
            <input type="checkbox" [checked]="prefs().tips" (change)="set('tips', $any($event.target).checked)" />
            <span><strong>Recordatorios e ideas</strong><small>Como mucho uno por semana, para ayudarte a seguir con tu meta.</small></span>
          </label>
          <div class="actions">
            <button type="button" class="primary" (click)="save(prefs())">Guardar</button>
            <button type="button" class="ghost" (click)="save({ courseNotices: false, tips: false })">No quiero recibir ningún correo</button>
          </div>
          @if (state() === 'saved') { <p class="note" role="status">Listo, guardamos tus preferencias.</p> }
          @if (state() === 'error') { <p class="note" role="alert">No pudimos guardar. Inténtalo de nuevo en un momento.</p> }
        }
      }
      <p><small>Los correos sobre tu cuenta, como recuperar la contraseña, se envían siempre que los pidas.</small></p>
    </main>
    <gems-public-footer />
  `
})
export class EmailPreferencesPageComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly url = `${environment.apiUrls.auth.base}/email-preferences/by-link`;
  private token = '';

  protected readonly state = signal<TState>('loading');
  protected readonly prefs = signal<IPrefs>({ courseNotices: true, tips: true });

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('t') ?? '';
    if (!this.token) { this.state.set('invalid'); return; }
    this.http.get<IPrefs>(this.url, { params: { t: this.token } }).subscribe({
      next: p => { this.prefs.set(p); this.state.set('ready'); },
      error: () => this.state.set('invalid')
    });
  }

  protected set(key: keyof IPrefs, value: boolean): void {
    this.prefs.update(p => ({ ...p, [key]: value }));
    if (this.state() === 'saved') this.state.set('ready');
  }

  protected save(prefs: IPrefs): void {
    this.http.put<IPrefs>(this.url, prefs, { params: { t: this.token } }).subscribe({
      next: p => { this.prefs.set(p); this.state.set('saved'); },
      error: () => this.state.set('error')
    });
  }
}
