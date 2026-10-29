import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, Injector, afterNextRender, computed, inject, input, output, signal, viewChild,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthSessionService } from 'auth/core';
import { EmptyStateComponent } from 'shared';
import { LoadErrorComponent, SkeletonComponent } from 'shared/loading';
import { COMENTARIO_MAX, ITapComentario, TapsSocialService } from './taps-social.service';

/**
 * Comentarios de un Tap: hoja inferior en móvil y cajón a la derecha desde 768 px (mismo patrón que el ranking).
 * Lista del más nuevo al más viejo con «Ver más», escribir (con sesión), reportar y borrar el propio. Se carga diferido.
 * Mientras está abierta el feed pausa la cuenta atrás (evento `abierto`).
 */
@Component({
  selector: 'gems-tap-comentarios',
  imports: [RouterLink, EmptyStateComponent, LoadErrorComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog class="cm" #dlg (close)="avisarCierre()" (click)="$event.target === dlg && cerrar()" aria-labelledby="cm-titulo">
      <div class="cm__cuerpo">
        <header class="cm__cabeza">
          <h2 id="cm-titulo" class="cm__titulo">Comentarios @if (total(); as n) { <span class="cm__total">{{ n }}</span> }</h2>
          <button type="button" class="cm__cerrar" (click)="cerrar()" aria-label="Cerrar los comentarios">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>
          </button>
        </header>
        <p class="cm__tap">{{ titulo() }}</p>

        <div class="cm__lista" [attr.aria-busy]="estado() === 'cargando'">
          @switch (estado()) {
            @case ('cargando') { <lib-skeleton shape="list-item" [count]="4" label="Cargando los comentarios" /> }
            @case ('error') { <lib-load-error class="cm__estado" compact [error]="error()" what="los comentarios" (retry)="cargar(null)" /> }
            @default {
              @if (lista().length === 0) {
                <lib-empty-state class="cm__estado" kind="first-use" icon="forum" size="sm" [headingLevel]="3"
                                 title="Todavía no hay comentarios" description="Cuenta qué te pareció este Tap." />
              } @else {
                <ul class="cm__items">
                  @for (c of lista(); track c.id) {
                    <li class="cm__item">
                      <p class="cm__autor">{{ c.alias }}@if (c.mio) { <span class="cm__tu">Tú</span> } <time [attr.datetime]="c.creado">{{ fecha(c.creado) }}</time></p>
                      <p class="cm__texto">{{ c.texto }}</p>
                      @if (c.mio) {
                        <button type="button" class="cm__accion" (click)="borrar(c)">Borrar</button>
                      } @else if (conSesion()) {
                        @if (reportados().has(c.id)) { <span class="cm__hecho" role="status">Reportado. Gracias.</span> }
                        @else { <button type="button" class="cm__accion" (click)="reportar(c)">Reportar</button> }
                      }
                    </li>
                  }
                </ul>
                @if (siguiente()) { <button type="button" class="cm__mas" [disabled]="estado() === 'mas'" (click)="cargar(siguiente())">Ver más comentarios</button> }
              }
            }
          }
        </div>

        <footer class="cm__pie">
          @if (conSesion()) {
            <div class="cm__form">
              <label class="visually-hidden" for="cm-texto">Escribe un comentario</label>
              <textarea id="cm-texto" #campo rows="2" [maxLength]="max" placeholder="Escribe un comentario" [value]="texto()"
                        (input)="texto.set(campo.value)" [attr.aria-describedby]="aviso() ? 'cm-aviso' : 'cm-cuenta'"></textarea>
              <div class="cm__fila">
                <span id="cm-cuenta" class="cm__cuenta">{{ texto().length }}/{{ max }}</span>
                <button type="button" class="cm__enviar" (click)="enviar()" [disabled]="!texto().trim() || enviando()">Publicar</button>
              </div>
              @if (aviso(); as a) { <p id="cm-aviso" class="cm__aviso" role="alert">{{ a }}</p> }
            </div>
          } @else {
            <p class="cm__nota">Para comentar necesitas una cuenta. <a routerLink="/auth/signin" (click)="cerrar()">Entrar</a></p>
          }
        </footer>
      </div>
    </dialog>
  `,
  styleUrl: './tap-comentarios.component.scss',
})
export class TapComentariosComponent {
  private readonly social = inject(TapsSocialService);
  private readonly session = inject(AuthSessionService, { optional: true });
  private readonly injector = inject(Injector);

  readonly tapId = input.required<string>();
  readonly titulo = input('');
  readonly abierto = output<void>();
  readonly cerrado = output<void>();

  protected readonly max = COMENTARIO_MAX;
  protected readonly conSesion = computed(() => !!this.session?.isAuthenticated());
  protected readonly estado = signal<'cargando' | 'error' | 'listo' | 'mas'>('cargando');
  protected readonly error = signal<unknown>(null);
  protected readonly lista = signal<ITapComentario[]>([]);
  protected readonly siguiente = signal<string | null>(null);
  protected readonly texto = signal('');
  protected readonly enviando = signal(false);
  protected readonly aviso = signal<string | null>(null);
  protected readonly reportados = signal(new Set<number>());
  protected readonly total = computed(() => this.social.de(this.tapId())?.comentarios || null);

  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dlg');
  private sub: Subscription | null = null;
  private avisado = false;

  constructor() {
    afterNextRender(() => {
      const d = this.dialog()?.nativeElement;
      if (d && !d.open) d.showModal?.();
      this.abierto.emit();
      this.cargar(null);
    }, { injector: this.injector });
    inject(DestroyRef).onDestroy(() => this.sub?.unsubscribe());
  }

  protected cargar(cursor: string | null): void {
    this.sub?.unsubscribe();
    this.estado.set(cursor ? 'mas' : 'cargando');
    this.sub = this.social.comentarios(this.tapId(), cursor).subscribe({
      next: p => {
        this.lista.update(l => cursor ? [...l, ...p.comentarios] : p.comentarios);
        this.siguiente.set(p.siguiente);
        this.estado.set('listo');
      },
      error: e => { if (cursor) this.estado.set('listo'); else { this.error.set(e); this.estado.set('error'); } },
    });
  }

  protected enviar(): void {
    const texto = this.texto().trim();
    if (!texto || this.enviando()) return;
    this.enviando.set(true);
    this.aviso.set(null);
    this.social.comentar(this.tapId(), texto).subscribe({
      next: c => { this.lista.update(l => [c, ...l]); this.texto.set(''); this.enviando.set(false); this.estado.set('listo'); },
      error: (e: unknown) => { this.aviso.set(motivo(e)); this.enviando.set(false); },
    });
  }

  protected borrar(c: ITapComentario): void {
    this.social.borrar(this.tapId(), c.id).subscribe({
      next: () => this.lista.update(l => l.filter(x => x.id !== c.id)),
      error: () => this.aviso.set('No pudimos borrar el comentario. Inténtalo otra vez.'),
    });
  }

  protected reportar(c: ITapComentario): void {
    this.social.reportar(this.tapId(), c.id).subscribe({
      next: () => this.reportados.update(s => new Set(s).add(c.id)),
      error: () => this.aviso.set('No pudimos enviar el reporte. Inténtalo otra vez.'),
    });
  }

  protected fecha(iso: string): string {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  }

  protected cerrar(): void {
    const d = this.dialog()?.nativeElement;
    if (d?.open) d.close();
    this.avisarCierre();
  }

  protected avisarCierre(): void {
    if (this.avisado) return;
    this.avisado = true;
    this.cerrado.emit();
  }
}

/** El motivo del servidor (400 del filtro, 429 del límite) o uno genérico. */
export function motivo(e: unknown): string {
  if (e instanceof HttpErrorResponse) {
    if (e.status === 401) return 'Tu sesión terminó. Vuelve a entrar para comentar.';
    const m = (e.error as { message?: unknown } | null)?.message;
    if ((e.status === 400 || e.status === 429) && typeof m === 'string' && m) return m;
  }
  return 'No pudimos publicar el comentario. Inténtalo otra vez.';
}
