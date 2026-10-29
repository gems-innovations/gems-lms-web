import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, inject, input, output, signal, viewChild } from '@angular/core';
import { TapsSocialService } from './taps-social.service';
import { COMENTARIO_MAX, ITapComentario, cifraCompacta, haceCuanto } from './taps.social';

/**
 * Hoja de comentarios de un Tap, tipo TikTok (solo con sesión: sin ella el riel abre la hoja de acceso). <dialog> modal:
 * foco atrapado, Escape cierra y el resto de la página queda inerte. Los textos se pintan con interpolación de Angular
 * (escapados, nunca innerHTML). Lista paginada de 20 en 20 con «Ver más»; borrar los propios y reportar los ajenos (con
 * confirmación). El 422 del API se muestra junto al campo.
 */
@Component({
  selector: 'gems-tap-comentarios',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #d class="hoja hoja--alta" aria-labelledby="com-h" (close)="cerrar.emit()" (click)="fuera($event)"
            (keydown)="$event.stopPropagation()" (pointerdown)="$event.stopPropagation()" (pointerup)="$event.stopPropagation()">
      <div class="hoja__caja">
        <span class="hoja__asa" aria-hidden="true"></span>
        <header class="com__cab">
          <h2 class="hoja__h" id="com-h">Comentarios @if (total() != null) { <span class="com__n">{{ cifra(total()!) }}</span> }</h2>
          <button type="button" class="com__x" (click)="d.close()" aria-label="Cerrar comentarios">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>
          </button>
        </header>
        <div class="com__lista">
          @if (estado() === 'cargando' && !lista().length) {
            <p class="com__vacio">Cargando comentarios...</p>
          } @else if (estado() === 'error' && !lista().length) {
            <p class="com__vacio">No se pudieron cargar los comentarios. <button type="button" class="com__link" (click)="cargar()">Reintentar</button></p>
          } @else if (!lista().length) {
            <p class="com__vacio">Aún no hay comentarios. Escribe el primero.</p>
          }
          <ul class="com__ul">
            @for (c of lista(); track c.id) {
              <li class="com__item">
                <p class="com__meta"><span class="com__autor">{{ c.autor }}</span> <span class="com__cuando">{{ cuando(c.creado) }}</span></p>
                <p class="com__texto">{{ c.texto }}</p>
                @if (c.mio) {
                  <button type="button" class="com__link" (click)="borrar(c)" [attr.aria-label]="'Borrar tu comentario: ' + c.texto">Borrar</button>
                } @else if (confirmar() === c.id) {
                  <p class="com__conf">¿Reportar este comentario?
                    <button type="button" class="com__link com__link--fuerte" (click)="reportar(c)">Sí, reportar</button>
                    <button type="button" class="com__link" (click)="confirmar.set(null)">Cancelar</button></p>
                } @else {
                  <button type="button" class="com__link" (click)="confirmar.set(c.id)" [attr.aria-label]="'Reportar el comentario de ' + c.autor">Reportar</button>
                }
              </li>
            }
          </ul>
          @if (siguiente()) {
            <button type="button" class="boton com__mas" (click)="cargar()" [disabled]="estado() === 'cargando'">{{ estado() === 'cargando' ? 'Cargando...' : 'Ver más' }}</button>
          }
        </div>
        <form class="com__form" (submit)="enviar($event)" novalidate>
          <label class="visually-hidden" for="com-in">Escribe un comentario</label>
          <input #campo id="com-in" class="com__in" type="text" autocomplete="off" enterkeyhint="send" placeholder="Añade un comentario..."
                 [attr.maxlength]="max" [value]="texto()" (input)="escribir($event)"
                 [attr.aria-invalid]="error() ? 'true' : null" [attr.aria-describedby]="error() ? 'com-err com-cuenta' : 'com-cuenta'">
          <button type="submit" class="com__enviar" [disabled]="enviando() || !texto().trim()" aria-label="Publicar comentario">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 12 20 4l-4 16-4-6-8-2z" fill="currentColor"/></svg>
          </button>
          <span class="com__cuenta" id="com-cuenta" [class.is-cerca]="texto().length > max - 20">{{ texto().length }}/{{ max }}</span>
          @if (error()) { <p class="com__err" id="com-err">{{ error() }}</p> }
        </form>
        <p class="visually-hidden" role="status" aria-live="polite">{{ aviso() }}</p>
      </div>
    </dialog>
  `,
  styleUrl: './tap-hoja.scss',
  styles: `
    .com__cab { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .com__n { margin-left: 4px; color: #9aa6b8; font-weight: 700; }
    .com__x { display: grid; place-items: center; width: 44px; height: 44px; margin-right: -8px; border: 0; border-radius: 50%; background: none; color: #e8edf4; cursor: pointer; }
    .com__lista { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; margin: 4px -18px 0; padding: 0 18px; }
    .com__ul { margin: 0; padding: 0; list-style: none; }
    .com__item { padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 255, .08); }
    .com__meta { margin: 0 0 2px; font-size: 13px; } .com__autor { font-weight: 800; color: #c8d1de; } .com__cuando { margin-left: 6px; color: #8b97a8; }
    .com__texto { margin: 0; font-size: 15px; line-height: 1.4; overflow-wrap: anywhere; white-space: pre-line; }
    .com__vacio { margin: 24px 0; text-align: center; color: #9aa6b8; }
    .com__link { min-height: 44px; padding: 0 10px 0 0; border: 0; background: none; color: #9aa6b8; font: inherit; font-size: 13px; font-weight: 700; cursor: pointer;
      &:hover { color: #fff; } &--fuerte { color: #ff8a9e; } }
    .com__conf { margin: 4px 0 0; font-size: 13px; color: #e8edf4; }
    .com__mas { width: 100%; margin: 10px 0; }
    .com__form { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 4px 8px; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, .1); }
    .com__in { min-height: 44px; padding: 0 16px; border: 1px solid rgba(255, 255, 255, .22); border-radius: 999px; background: #0d1117; color: #fff; font: inherit; font-size: 16px;
      &[aria-invalid='true'] { border-color: #ff8a9e; } }
    .com__enviar { display: grid; place-items: center; width: 44px; height: 44px; border: 0; border-radius: 50%; background: #4de1ff; color: #0d1117; cursor: pointer;
      &:disabled { opacity: .45; cursor: default; } }
    .com__cuenta { grid-column: 1; justify-self: end; font-size: 12px; color: #8b97a8; &.is-cerca { color: #ffd166; } }
    .com__err { grid-column: 1 / -1; margin: 0; font-size: 13px; color: #ff8a9e; }
  `,
})
export class TapComentariosComponent {
  readonly tapId = input.required<string>();
  /** Cifra pública del Tap (la del riel). */
  readonly total = input<number | null>(null);
  readonly cerrar = output<void>();

  protected readonly max = COMENTARIO_MAX;
  protected readonly cifra = cifraCompacta;
  protected readonly lista = signal<ITapComentario[]>([]);
  protected readonly siguiente = signal<string | null>(null);
  protected readonly estado = signal<'cargando' | 'listo' | 'error'>('cargando');
  protected readonly texto = signal('');
  protected readonly error = signal('');
  protected readonly enviando = signal(false);
  protected readonly aviso = signal('');
  /** Comentario ajeno a punto de reportarse (pide confirmación). */
  protected readonly confirmar = signal<string | null>(null);

  private readonly social = inject(TapsSocialService);
  private readonly d = viewChild.required<ElementRef<HTMLDialogElement>>('d');
  private readonly campo = viewChild.required<ElementRef<HTMLInputElement>>('campo');
  private vivo = true;

  constructor() {
    inject(DestroyRef).onDestroy(() => (this.vivo = false));
    afterNextRender(() => { const d = this.d().nativeElement; if (!d.open) d.showModal(); this.campo().nativeElement.focus(); this.cargar(); });
  }

  protected cuando(iso: string): string { return haceCuanto(iso); }

  /** Primera página o la siguiente (cursor `siguiente`). */
  protected cargar(): void {
    this.estado.set('cargando');
    this.social.comentarios(this.tapId(), this.lista().length ? this.siguiente() : null).subscribe({
      next: p => {
        if (!this.vivo) return;
        const ya = new Set(this.lista().map(c => c.id));
        this.lista.update(l => [...l, ...p.comentarios.filter(c => !ya.has(c.id))]);
        this.siguiente.set(p.siguiente);
        this.estado.set('listo');
      },
      error: (e: { status?: number }) => { if (!this.vivo) return; if (e?.status === 404) this.d().nativeElement.close(); else this.estado.set('error'); },
    });
  }

  protected escribir(e: Event): void { this.texto.set((e.target as HTMLInputElement).value); if (this.error()) this.error.set(''); }

  /** Enter o el botón: publica (1 a 200 caracteres). El 422 trae el mensaje del API. */
  protected enviar(e: Event): void {
    e.preventDefault();
    const texto = this.texto().trim();
    if (!texto || this.enviando()) return;
    if (texto.length > this.max) { this.error.set(`Máximo ${this.max} caracteres.`); return; }
    this.enviando.set(true);
    this.social.comentar(this.tapId(), texto).subscribe({
      next: c => {
        if (!this.vivo) return;
        this.enviando.set(false);
        this.lista.update(l => [{ ...c, mio: true }, ...l]);
        this.texto.set('');
        this.anunciar('Comentario publicado');
      },
      error: (err: { status?: number; error?: { message?: unknown; mensaje?: unknown } }) => {
        if (!this.vivo) return;
        this.enviando.set(false);
        const m = err?.error?.message ?? err?.error?.mensaje;
        this.error.set(err?.status === 422 && typeof m === 'string' && m ? m
          : err?.status === 429 ? 'Vas muy rápido. Espera un momento y vuelve a intentarlo.'
          : 'No se pudo publicar. Revisa tu conexión y vuelve a intentarlo.');
        this.campo().nativeElement.focus();
      },
    });
  }

  protected borrar(c: ITapComentario): void {
    this.social.borrarComentario(this.tapId(), c.id).subscribe({
      next: () => { if (!this.vivo) return; this.lista.update(l => l.filter(x => x.id !== c.id)); this.anunciar('Comentario borrado'); this.campo().nativeElement.focus(); },
      error: () => this.vivo && this.anunciar('No se pudo borrar el comentario'),
    });
  }

  protected reportar(c: ITapComentario): void {
    this.confirmar.set(null);
    this.social.reportar(c.id).subscribe({
      next: () => this.vivo && this.anunciar('Comentario reportado. Gracias, lo revisaremos.'),
      error: () => this.vivo && this.anunciar('No se pudo reportar el comentario'),
    });
  }

  /** Tocar fuera de la caja (el fondo) cierra. */
  protected fuera(e: MouseEvent): void { e.stopPropagation(); if (e.target === this.d().nativeElement) this.d().nativeElement.close(); }

  private anunciar(texto: string): void { this.aviso.set(''); queueMicrotask(() => this.aviso.set(texto)); }
}
