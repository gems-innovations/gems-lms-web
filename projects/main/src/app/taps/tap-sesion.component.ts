import {
  ChangeDetectionStrategy, Component, ElementRef, afterNextRender, computed, input, output, signal, viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { IResumenSesion, goalLabel, sessionLabel, streakLabel } from './taps.sesion';
import { IRetoVista, retoLabel } from './taps.reto';
import { IAvanceColeccion, insigniasGanadas } from './taps.coleccion';
import { TapColeccionComponent } from './tap-coleccion.component';

/** Llama dibujada (sin emojis): racha. Apagada (contorno) si hoy aún no cuenta. */
const LLAMA = 'M12 2.5c.9 3.2 4.6 5.2 4.6 9.9a4.6 4.6 0 0 1-9.2 0c0-2.1 1-3.6 2.1-4.6.3 1.7 1 2.7 2 3.1-.1-3.3-.8-5.8.5-8.4Z';

export interface ITemaAvance { nombre: string; hechos: number; total: number; color: string }

/**
 * Progreso de la sesión (auditoria-permanencia.md, mejora 1): racha, meta de 3 Taps al día y avance del tema.
 * - `chip`: en la barra del celular, junto al logo, en lugar del nombre de la marca («2 · Hoy 1/3»). Entre 360 y 399 px queda
 *   «2 · 1/3» y por debajo de 360 px solo la llama y el número.
 * - `franja`: arriba del resultado de cada Tap, con el avance del tema («Minecraft 5 de 23»).
 * Al cumplir la meta se celebra una vez («Meta de hoy lista») y no se pide nada más: el feed sigue igual, sin presión.
 * Nunca se dice nada de perder la racha. Para lectores de pantalla, la frase completa va en texto visualmente oculto (lo
 * visible se marca aria-hidden): sin aria-label en elementos sin rol.
 */
@Component({
  selector: 'gems-tap-sesion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let r = resumen();
    @if (vista() === 'chip') {
      <span class="chip">
        <span class="oculto">{{ etiqueta() }}</span>
        <svg class="llama" [class.is-off]="!r.rachaHoy" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path [attr.d]="llama"/></svg>
        <b aria-hidden="true">{{ r.racha }}</b>
        <span class="chip__hoy" aria-hidden="true"><span class="chip__palabra">Hoy </span>{{ hoy() }}/{{ r.meta.meta }}</span>
      </span>
    } @else {
      <div class="franja" [class.is-meta]="celebrar()" role="group" aria-label="Tu progreso de hoy">
        <span class="franja__item">
          <svg class="llama" [class.is-off]="!r.rachaHoy" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path [attr.d]="llama"/></svg>
          <span aria-hidden="true">Racha {{ r.racha }}</span><span class="oculto">{{ racha() }}.</span>
        </span>
        <span class="franja__item">
          <span class="puntos" aria-hidden="true">
            @for (k of [0, 1, 2]; track k) { <i [class.is-on]="k < r.meta.hechos"></i> }
          </span>
          <span aria-hidden="true">{{ celebrar() ? 'Meta de hoy lista' : 'Hoy ' + hoy() + '/' + r.meta.meta }}</span><span class="oculto">{{ meta() }}.</span>
        </span>
        @if (tema(); as t) {
          <span class="franja__item franja__tema" [style.--c]="t.color">
            <i class="tema__punto" aria-hidden="true"></i>{{ t.nombre }} {{ t.hechos }} de {{ t.total }}
          </span>
        }
      </div>
    }
  `,
  styles: `
    :host { display: contents; }
    .oculto { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
    .llama { flex: none; fill: #ffb547; filter: drop-shadow(0 1px 1px rgba(0, 0, 0, .4));
      &.is-off { fill: none; stroke: #ffb547; stroke-width: 2; } }
    .chip { display: inline-flex; align-items: center; gap: 3px; font-size: 13px; font-weight: 800; font-variant-numeric: tabular-nums; color: #fff;
      text-shadow: 0 1px 2px rgba(0, 0, 0, .6); white-space: nowrap;
      b { font-weight: 800; } }
    .chip__hoy { margin-left: 4px; padding: 2px 7px; border-radius: 999px; background: rgba(8, 10, 14, .45); border: 1px solid rgba(255, 255, 255, .2); text-shadow: none; }
    /* El logo de 28 px se queda siempre: 360-399 px, la píldora sin la palabra («1/3»); < 360 px, solo llama y número. */
    @media (max-width: 399px) { .chip__palabra { display: none; } }
    @media (max-width: 359px) { .chip__hoy { display: none; } }
    .franja { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px 14px; margin: 0 0 10px; padding: 7px 10px; border-radius: 14px;
      font-size: 14px; font-weight: 700; color: #dfe6ef; background: rgba(255, 255, 255, .06); font-variant-numeric: tabular-nums; }
    .franja__item { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
    .puntos { display: inline-flex; gap: 3px;
      i { width: 9px; height: 9px; border-radius: 50%; border: 1.5px solid #4de1ff; }
      i.is-on { background: #4de1ff; } }
    .tema__punto { width: 9px; height: 9px; border-radius: 3px; background: var(--c, #8b93a7); }
    .franja.is-meta { color: #fff; background: rgba(77, 225, 255, .16); animation: meta-pop .5s cubic-bezier(.2, 1.3, .4, 1); }
    @keyframes meta-pop { 0% { transform: scale(.94); } 60% { transform: scale(1.03); } 100% { transform: scale(1); } }
    @media (prefers-reduced-motion: reduce) { .franja.is-meta { animation: none; } }
  `,
})
export class TapSesionComponent {
  readonly resumen = input.required<IResumenSesion>();
  readonly vista = input<'chip' | 'franja'>('chip');
  readonly tema = input<ITemaAvance | null>(null);
  /** Este resultado cumplió la meta del día (se celebra una sola vez). */
  readonly celebrar = input(false);
  protected readonly llama = LLAMA;

  /** Taps de hoy contra la meta: pasada la meta se muestra 3/3 (no «4/3»). */
  protected hoy(): number { return Math.min(this.resumen().meta.hechos, this.resumen().meta.meta); }
  protected etiqueta(): string { return sessionLabel(this.resumen()); }
  protected racha(): string { return streakLabel(this.resumen()); }
  protected meta(): string { return goalLabel(this.resumen()); }
}

/**
 * Hoja «Tu día en Taps» que abre el logo de la barra en el celular (antes el logo sacaba del juego a la portada con un toque
 * de más: hallazgo 5). Resume racha, meta y avance por tema; «Seguir jugando» cierra y la portada queda a un toque más,
 * sin «¿seguro que te vas?».
 */
@Component({
  selector: 'gems-tap-sesion-hoja',
  imports: [RouterLink, TapSesionComponent, TapColeccionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog class="hoja" #hoja (close)="cerrar.emit()" (click)="$event.target === hoja && hoja.close()" aria-labelledby="taps-hoja-dia">
      <div class="hoja__body">
        <h2 id="taps-hoja-dia" class="hoja__title" tabindex="-1" #titulo>Tu día en Taps</h2>
        <gems-tap-sesion vista="franja" [resumen]="resumen()" />
        <p class="hoja__nota">{{ nota() }}</p>
        <!-- Sonido: el primer interruptor es el mismo silencio general del altavoz de la barra (todo); música y voz, debajo, son
             opciones de detalle. Sin sonido general, música y voz se ven atenuadas y encender una lo enciende. -->
        <section class="musica-caja" [class.is-mudo]="!sonidoOn()" aria-labelledby="taps-hoja-sonido">
          <h3 class="hoja__sub" id="taps-hoja-sonido">Sonido</h3>
          <button type="button" class="musica" (click)="alternarSonido.emit()" [attr.aria-pressed]="sonidoOn()" aria-label="Todo el sonido" aria-describedby="taps-sonido-nota">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5Z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
            <span class="musica__txt">Todo el sonido<small id="taps-sonido-nota">Efectos, música y voz. Igual que el altavoz de arriba.</small></span>
            <span class="musica__sw" aria-hidden="true"><i></i></span>
          </button>
          <button type="button" class="musica musica--sub" (click)="alternarMusica.emit()" [attr.aria-pressed]="musica()" [attr.aria-describedby]="sonidoOn() ? null : 'taps-sonido-apagado'">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M9 18V5l11-2v13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6.5" cy="18" r="2.5" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="17.5" cy="16" r="2.5" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>
            <span class="musica__txt">Música de fondo</span>
            <span class="musica__sw" aria-hidden="true"><i></i></span>
          </button>
          @if (voz() === 'on' || voz() === 'off') {
            <button type="button" class="musica musica--sub" (click)="alternarVoz.emit()" [attr.aria-pressed]="voz() === 'on'" aria-label="Voz del personaje" aria-describedby="taps-voz-nota">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 21v-3.5A7 7 0 1 1 14.6 11.5l1.6 3h-1.7V17a2 2 0 0 1-2 2H10v2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 7.5a4 4 0 0 1 0 5M20.5 5a7.5 7.5 0 0 1 0 10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
              <span class="musica__txt">Voz del personaje<small id="taps-voz-nota">Lee las preguntas en voz alta. Con lector de pantalla, mejor apagada.</small></span>
              <span class="musica__sw" aria-hidden="true"><i></i></span>
            </button>
          }
          @if (!sonidoOn()) { <p class="musica__nota" id="taps-sonido-apagado">El sonido está apagado. Encender la música o la voz también lo activa.</p> }
        </section>
        @if (reto(); as r) {
          <section class="reto" aria-labelledby="taps-hoja-reto">
            <p class="reto__over" id="taps-hoja-reto">{{ etiquetaReto(r.numero) }} · {{ r.temaNombre }}</p>
            @if (r.hecho; as h) {
              <p class="reto__texto">Tu reto de hoy: {{ h.score }} de {{ h.total }}. Mañana hay otro.</p>
              <button type="button" class="reto__btn reto__btn--sec" (click)="compartirReto.emit()">Retar a un amigo con el reto</button>
            } @else {
              <p class="reto__texto">El mismo Tap para todos. Cambia cada día y cuenta tu primer intento.</p>
              <button type="button" class="reto__btn" (click)="jugarReto.emit()">Jugar el reto de hoy</button>
            }
          </section>
        }
        @if (temas().length) {
          <ul class="hoja__temas">
            @for (t of temas(); track t.nombre) {
              <li [style.--c]="t.color">
                <span class="hoja__nombre"><i aria-hidden="true"></i>{{ t.nombre }}</span>
                <span class="hoja__barra" aria-hidden="true"><b [style.width.%]="t.total ? (t.hechos / t.total) * 100 : 0"></b></span>
                <span class="hoja__cuenta">{{ t.hechos }} de {{ t.total }}</span>
              </li>
            }
          </ul>
        }
        @if (colecciones().length) {
          <section class="cols" aria-labelledby="taps-hoja-cols">
            <h3 class="hoja__sub" id="taps-hoja-cols" tabindex="-1" #cols>Colecciones <span>{{ ganadas() }} de {{ colecciones().length }} insignias</span></h3>
            <p class="hoja__ayuda">Completa un subtema y ganas bronce; con 80 % de aciertos, plata; todo perfecto, oro.</p>
            @if (visibles().length) {
              <ul class="cols__lista">
                @for (a of visibles(); track a.col.id) { <li><gems-tap-coleccion [avance]="a" vista="lista" /></li> }
              </ul>
            } @else {
              <p class="hoja__ayuda">Aún no empiezas ninguna. Al terminar un Tap se llena la primera casilla de su colección.</p>
            }
            @if (!todas() && visibles().length < colecciones().length) {
              <button type="button" class="cols__todas" (click)="todas.set(true)">Ver las {{ colecciones().length }} colecciones</button>
            }
          </section>
        }
        <p class="hoja__solo">Se guarda solo en este navegador.</p>
        <!-- «Seguir jugando» siempre a la vista, aunque la lista de colecciones sea larga. -->
        <div class="hoja__pie">
          <button type="button" class="hoja__seguir" (click)="hoja.close()">Seguir jugando</button>
          <a class="hoja__portada" routerLink="/">Ir a la portada de GEMS LMS</a>
        </div>
      </div>
    </dialog>
  `,
  styles: `
    :host { --safe-b: max(12px, calc(env(safe-area-inset-bottom) + 8px)); font-family: var(--font-texto, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif); }
    .hoja { width: 100%; max-width: 480px; margin: auto auto 0; padding: 0; border: 0; border-radius: 22px 22px 0 0; color: #fff; background: #161b24;
      &::backdrop { background: rgba(0, 0, 0, .55); }
      &[open] { animation: hoja-in .26s cubic-bezier(.2, 1.1, .4, 1); } }
    .hoja { max-height: 92dvh; overflow-y: auto; overscroll-behavior: contain; }
    @media (min-width: 768px) { .hoja { margin: auto; border-radius: 22px; max-height: 86dvh; } }
    .hoja__body { padding: 16px 16px 0; }
    .hoja__pie { position: sticky; bottom: 0; padding: 10px 0 var(--safe-b); background: #161b24; box-shadow: 0 -12px 12px -4px #161b24; }
    .hoja__sub { display: flex; justify-content: space-between; align-items: baseline; margin: 4px 0 2px; font-size: 16px;
      span { font-size: 13px; font-weight: 700; color: #c8d1de; } }
    .hoja__ayuda { margin: 0 0 6px; font-size: 13px; line-height: 1.35; color: #aab4c4; }
    .reto { margin: 0 0 14px; padding: 12px; border-radius: 16px; background: rgba(77, 225, 255, .1); border: 1px solid rgba(77, 225, 255, .3); }
    .reto__over { margin: 0 0 4px; font-size: 12px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #9fe9ff; }
    .reto__texto { margin: 0 0 10px; font-size: 15px; line-height: 1.4; }
    .reto__btn { width: 100%; min-height: 48px; border: 0; border-radius: 14px; font: inherit; font-weight: 800; color: #0d1117; background: #4de1ff; cursor: pointer; }
    .reto__btn--sec { color: #fff; background: transparent; border: 1.5px solid rgba(255, 255, 255, .3); }
    .cols { margin: 0 0 12px; }
    .hoja__sub, .hoja__title { outline: none; scroll-margin-top: 12px; }
    .cols__todas { width: 100%; min-height: 44px; margin-top: 6px; border-radius: 12px; font: inherit; font-weight: 700; color: #fff; background: transparent; border: 1.5px solid rgba(255, 255, 255, .22); cursor: pointer; }
    .cols__lista { display: grid; gap: 2px; margin: 0; padding: 0; list-style: none; }
    .hoja__title { margin: 0 0 12px; font-size: 18px; }
    .musica-caja { margin: 0 0 14px; padding: 10px 12px 6px; border-radius: 14px; background: rgba(255, 255, 255, .06); border: 1px solid rgba(255, 255, 255, .14);
      .hoja__sub { margin: 0 0 2px; } }
    .musica { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 48px; padding: 4px 0; border: 0; border-radius: 10px; font: inherit; text-align: left;
      color: #fff; background: none; cursor: pointer;
      svg { flex: none; } }
    .musica--sub { border-top: 1px solid rgba(255, 255, 255, .1); border-radius: 0; }
    /* Sin sonido general, música y voz se ven atenuadas (siguen siendo tocables: encender una enciende el sonido). */
    .is-mudo .musica--sub { opacity: .6; }
    .musica__txt { flex: 1; font-weight: 800;
      small { display: block; margin-top: 1px; font-size: 12px; font-weight: 600; line-height: 1.35; color: #aab4c4; } }
    .musica__nota { margin: 2px 0 6px 32px; font-size: 12px; font-weight: 600; line-height: 1.35; color: #f2c94c; }
    .musica__sw { flex: none; width: 44px; height: 26px; padding: 3px; border-radius: 999px; background: rgba(255, 255, 255, .22); transition: background .2s;
      i { display: block; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: transform .2s; } }
    .musica[aria-pressed='true'] .musica__sw { background: #4de1ff; i { transform: translateX(18px); } }
    @media (prefers-reduced-motion: reduce) { .musica__sw, .musica__sw i { transition: none; } }
    .hoja__nota { margin: 0 0 12px; font-size: 15px; line-height: 1.4; color: #c8d1de; }
    .hoja__temas { display: grid; gap: 10px; margin: 0 0 10px; padding: 0; list-style: none;
      li { display: grid; grid-template-columns: 1fr auto; gap: 4px 10px; align-items: center; } }
    .hoja__nombre { display: inline-flex; align-items: center; gap: 8px; font-weight: 800;
      i { width: 12px; height: 12px; border-radius: 4px; background: var(--c); } }
    .hoja__cuenta { font-size: 13px; font-weight: 700; color: #c8d1de; font-variant-numeric: tabular-nums; }
    .hoja__barra { grid-column: 1 / -1; height: 6px; border-radius: 999px; background: rgba(255, 255, 255, .1); overflow: hidden;
      b { display: block; height: 100%; border-radius: inherit; background: var(--c); } }
    .hoja__solo { margin: 0 0 12px; font-size: 12px; color: #aab4c4; }
    .hoja__seguir, .hoja__portada { display: flex; align-items: center; justify-content: center; width: 100%; min-height: 48px; border-radius: 14px; font: inherit; font-weight: 800; }
    .hoja__seguir { border: 0; color: #10141b; background: #f3f5f8; cursor: pointer; }
    .hoja__portada { margin-top: 8px; color: #c8d1de; text-decoration: none; font-weight: 700; }
    a:focus-visible, button:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
    @keyframes hoja-in { from { transform: translateY(100%); } }
    @media (prefers-reduced-motion: reduce) { .hoja[open] { animation: none; } }
  `,
})
export class TapSesionHojaComponent {
  readonly resumen = input.required<IResumenSesion>();
  readonly temas = input<ITemaAvance[]>([]);
  /** Reto del día (null si aún no se sabe la fecha). */
  readonly reto = input<IRetoVista | null>(null);
  readonly colecciones = input<IAvanceColeccion[]>([]);
  /** Abrir directamente en las colecciones (desde el resultado o el fin del feed). */
  readonly foco = input<'colecciones' | null>(null);
  readonly cerrar = output<void>();
  readonly jugarReto = output<void>();
  readonly compartirReto = output<void>();
  /** Sonido general (el mismo del altavoz de la barra). */
  readonly sonido = input<'on' | 'off' | null>(null);
  readonly alternarSonido = output<void>();
  /** Música de fondo encendida (preferencia guardada). */
  readonly musica = input(false);
  readonly alternarMusica = output<void>();
  /** Voz que lee las preguntas; `null`/`'none'`: aún no se sabe o el dispositivo no tiene voz (no se muestra). */
  readonly voz = input<'on' | 'off' | 'none' | null>(null);
  readonly alternarVoz = output<void>();
  protected readonly sonidoOn = computed(() => this.sonido() === 'on');
  private readonly hoja = viewChild.required<ElementRef<HTMLDialogElement>>('hoja');
  private readonly cols = viewChild<ElementRef<HTMLElement>>('cols');
  private readonly titulo = viewChild<ElementRef<HTMLElement>>('titulo');

  constructor() {
    // El foco va al título de la hoja o, si se abrió para ver las colecciones, a su encabezado (y se desplaza hasta ahí).
    afterNextRender(() => {
      const d = this.hoja().nativeElement;
      if (!d.open) d.showModal?.();
      const destino = this.foco() === 'colecciones' ? this.cols()?.nativeElement : this.titulo()?.nativeElement;
      destino?.focus({ preventScroll: true });
      destino?.scrollIntoView({ block: 'start' });
    });
  }

  protected etiquetaReto(n: number): string { return retoLabel(n); }
  protected ganadas(): number { return insigniasGanadas(this.colecciones()); }
  /** «Ver las 16»: por defecto solo se listan las colecciones empezadas (la hoja no se vuelve una lista larga). */
  protected readonly todas = signal(false);
  protected readonly visibles = computed(() => {
    const cols = this.colecciones(), empezadas = cols.filter(a => a.hechos > 0);
    return this.todas() ? [...empezadas, ...cols.filter(a => a.hechos === 0)] : empezadas;
  });

  /** Nota sin presión: la meta es una invitación y 1 Tap ya cuenta para la racha. */
  protected nota(): string {
    const r = this.resumen();
    if (r.meta.cumplida) return 'Meta de hoy lista. Lo que juegues ahora es por gusto.';
    if (r.meta.hechos === 0) {
      return r.racha > 0 ? `${streakLabel(r)}. Hoy hay Taps nuevos. La meta de hoy: 3 Taps.` : 'La meta de hoy: 3 Taps. 1 Tap ya cuenta para la racha.';
    }
    return `Llevas ${r.meta.hechos} de ${r.meta.meta} Taps hoy. La meta de hoy: 3 Taps.`;
  }
}
