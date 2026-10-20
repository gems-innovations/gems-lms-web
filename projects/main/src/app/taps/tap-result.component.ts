import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { resultFor } from './taps.logic';
import { TPartidaEstado } from './taps.ranking';
import { TapXpComponent } from './tap-xp.component';
import { lineaResultado } from './taps.frases';
import { rematchGoal } from './taps.panel';
import { IRetoVista, retoLabel } from './taps.reto';
import { IAvanceColeccion, TGrado } from './taps.coleccion';
import { TapColeccionComponent } from './tap-coleccion.component';
import { ITap, ITapRun } from './taps.types';

/** El reto del día visto desde el resultado del Tap del reto. */
export interface IRetoResultado {
  numero: number;
  /** El intento que cuenta (el primero del día). */
  oficial: { score: number; total: number } | null;
  /** Esta partida es una repetición: no cambia el resultado del reto. */
  repeticion: boolean;
}

/**
 * Resultado de un Tap (experiencia-ux.md §5.5): título que nunca es negativo, cuadrícula de aciertos sin spoilers
 * (patrón Wordle) y «Retar a un amigo» como botón principal. El resultado no avanza solo: es el momento de compartir.
 * Bajo la línea va la tarjeta de XP y ranking (solo con datos reales del API; sin ellos no aparece).
 * La racha y la meta del día están en la barra (no se repiten aquí); al cumplir la meta se celebra una vez con un chip.
 *
 * Permanencia (auditoria-permanencia.md, mejoras 4-6 y 9):
 * - La colección del subtema en una fila de ~44 px (casilla recién llenada, insignia y «casi» honesto); tocarla abre todas.
 * - Con 3/5 o 4/5 y a 1 acierto del siguiente título, «Revancha» pasa a ser el botón principal (solo cuando es verdad).
 * - El siguiente Tap se anuncia con su primera pregunta en la pestaña que asoma abajo (sin la respuesta).
 * - Al final del feed no hay salida a los cursos como botón: reto del día, colecciones y temas; los cursos, como enlace discreto.
 */
@Component({
  selector: 'gems-tap-result',
  imports: [RouterLink, TapXpComponent, TapColeccionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="res">
      @if (celebrar()) { <p class="res__meta" role="status">Meta de hoy lista: 3 Taps</p> }
      <p class="res__over" [class.res__over--reto]="!!reto()">@if (reto(); as r) { {{ etiquetaReto(r.numero) }} · tu título } @else { Tu título }</p>
      <h2 class="res__title" tabindex="-1">{{ result().title }}</h2>
      <p class="res__score">{{ run().score }} de {{ tap().questions.length }} · <span class="res__theme">{{ tap().title }}</span></p>
      <ol class="res__grid" [attr.aria-label]="run().score + ' aciertos de ' + tap().questions.length">
        @for (q of tap().questions; track q.id; let k = $index) {
          <li [class.is-ok]="run().answers[k] === true" [class.is-bad]="run().answers[k] === false"
              [attr.aria-label]="'Pregunta ' + (k + 1) + ': ' + (run().answers[k] ? 'acierto' : 'fallo')">
            @if (run().answers[k]) {
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            } @else {
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg>
            }
          </li>
        }
      </ol>
      <p class="res__line">{{ line() }}</p>
      @if (reto(); as r) {
        @if (r.repeticion && r.oficial) {
          <p class="res__reto-nota">Tu reto de hoy quedó en {{ r.oficial.score }} de {{ r.oficial.total }}. Repetir no lo cambia.</p>
        }
      }
      @if (xp()) { <gems-tap-xp [estado]="xp()" (ranking)="ranking.emit()" /> }
      @if (coleccion(); as c) {
        <gems-tap-coleccion class="res__col" [avance]="c" [recien]="tap().id" [nueva]="coleccionNueva()" (abrir)="colecciones.emit()" />
      }

      @if (casi(); as c) {
        <button type="button" class="res__main res__main--revancha" (click)="revancha.emit()">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span>Revancha: te falta 1 para «{{ c.title }}»</span>
        </button>
      } @else {
        <button type="button" class="res__main" (click)="challenge.emit()">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M14 5l7 7-7 7M21 12H10a7 7 0 0 0-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Retar a un amigo
        </button>
      }
      @if (notice(); as n) {
        <p class="res__notice" role="status">{{ n.text }}
          @if (n.download) { <a [href]="n.download" [attr.download]="'gems-taps-' + tap().id + '.png'">Descargar imagen</a> }
        </p>
      }
      <div class="res__row">
        @if (casi()) {
          <button type="button" class="res__ghost" (click)="challenge.emit()">Retar a un amigo</button>
        } @else {
          <button type="button" class="res__ghost" (click)="again.emit()">Repetir</button>
        }
        <button type="button" class="res__ghost" (click)="more.emit()">Más de {{ topicName() }}</button>
      </div>
      @if (hasNext()) {
        <!-- La primera pregunta del siguiente Tap va en la pestaña que asoma abajo (.tap__peek del feed). -->
        <button type="button" class="res__next" (click)="next.emit()">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="m6 15 6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Desliza para el siguiente tema
        </button>
      } @else {
        <div class="res__fin">
          <p class="res__fin-t">Ya jugaste todos los Taps de esta lista. Aún hay más para jugar:</p>
          @if (fin(); as r) {
            @if (r.hecho; as h) {
              <button type="button" class="res__fin-btn" (click)="irReto.emit()"><b>{{ etiquetaReto(r.numero) }}</b><span>Tu reto: {{ h.score }} de {{ h.total }}. Mañana hay otro.</span></button>
            } @else {
              <button type="button" class="res__fin-btn res__fin-btn--main" (click)="irReto.emit()"><b>Jugar el {{ etiquetaReto(r.numero) }}</b><span>El mismo Tap para todos. Cambia cada día</span></button>
            }
          }
          <button type="button" class="res__fin-btn" (click)="colecciones.emit()"><b>Tus colecciones</b><span>Completa subtemas y gana insignias</span></button>
          <button type="button" class="res__fin-btn" (click)="temas.emit()"><b>Elegir otro tema</b><span>Minecraft, lógica, cultura general</span></button>
          <a class="res__cursos" routerLink="/" (click)="cursos.emit()">O mira los cursos gratis de GEMS LMS</a>
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .res { padding: 14px 14px 10px; border-radius: 22px; background: rgba(22, 27, 36, .94); border: 1px solid rgba(255, 255, 255, .1); text-align: center; animation: res-in .5s cubic-bezier(.2, 1.3, .4, 1); }
    .res__meta { display: inline-block; margin: 0 0 6px; padding: 3px 12px; border-radius: 999px; font-size: 13px; font-weight: 800; color: #0d1117; background: #4de1ff;
      animation: meta-pop .5s cubic-bezier(.2, 1.3, .4, 1); }
    .res__over { margin: 0; font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #aab4c4; }
    .res__over--reto { color: #9fe9ff; }
    .res__reto-nota { margin: -4px 0 10px; font-size: 14px; color: #9fe9ff; }
    .res__title { margin: 2px 0 2px; outline: none; font-size: clamp(1.6rem, 7.5vw, 2.25rem); font-weight: 800; letter-spacing: -.01em; line-height: 1.08; color: #fff; text-wrap: balance; }
    .res__score { margin: 0 0 8px; font-size: 1rem; font-weight: 700; color: #c8d1de; font-variant-numeric: tabular-nums; }
    .res__theme { font-family: var(--tap-display-font, inherit); }
    .res__grid { display: flex; justify-content: center; gap: 8px; margin: 0 0 8px; padding: 0; list-style: none;
      li { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 8px; background: #3a4150; color: #fff; }
      .is-ok { background: #2FBF71; color: #06210f; }
      .is-bad { background: #D1343A; } }
    .res__line { margin: 0 0 10px; font-size: 1rem; line-height: 1.35; color: #dfe6ef; }
    .res__col { margin: 0 0 10px; }
    .res__main, .res__ghost, .res__next, .res__fin-btn { font: inherit; cursor: pointer; }
    .res__main { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; min-height: 52px; border: 0; border-radius: 16px;
      font-size: 1.125rem; font-weight: 800; color: #10141b; background: #f3f5f8; box-shadow: 0 4px 0 #9aa3b2;
      &:active { transform: translateY(2px); box-shadow: 0 2px 0 #9aa3b2; }
      svg { flex: none; } }
    .res__main--revancha { padding: 6px 12px; font-size: 1.0625rem; line-height: 1.2; color: #1b1300; background: #F5B83D; box-shadow: 0 4px 0 #a77412;
      &:active { box-shadow: 0 2px 0 #a77412; } }
    .res__notice { margin: 10px 0 0; font-size: 1rem; overflow-wrap: anywhere; color: #dfe6ef; a { margin-left: 6px; color: #9fd0ff; font-weight: 700; } }
    .res__row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
    .res__ghost { min-height: 48px; padding: 6px 8px; border-radius: 14px; font-size: 1rem; font-weight: 700; color: #fff; background: transparent; border: 1.5px solid rgba(255, 255, 255, .26); }
    .res__next { display: flex; flex-direction: column; align-items: center; gap: 0; width: 100%; min-height: 44px; margin-top: 4px; padding: 2px; border: 0; background: none;
      font-size: 1rem; font-weight: 700; color: #c8d1de; text-decoration: none;
      svg { animation: res-bounce 1.6s ease-in-out 2s 3; } }
    .res__fin { display: grid; gap: 8px; margin-top: 12px; text-align: left; }
    .res__fin-t { margin: 0; font-size: 14px; font-weight: 700; color: #c8d1de; text-align: center; }
    .res__fin-btn { display: grid; gap: 2px; width: 100%; min-height: 56px; padding: 8px 14px; border-radius: 14px; color: #fff; background: rgba(255, 255, 255, .06); border: 1.5px solid rgba(255, 255, 255, .18); text-align: left;
      b { font-size: 1rem; } span { font-size: 13px; font-weight: 600; color: #c8d1de; } }
    .res__fin-btn--main { color: #0d1117; background: #4de1ff; border-color: #4de1ff; span { color: #0d3340; } }
    .res__cursos { display: block; padding: 10px 4px 2px; font-size: 14px; font-weight: 600; color: #aab4c4; text-align: center; text-underline-offset: 3px; }
    button:focus-visible, a:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
    @keyframes res-in { from { opacity: 0; transform: translateY(18px) scale(.97); } }
    @keyframes res-bounce { 0%, 100% { transform: translateY(0); } 40% { transform: translateY(-7px); } }
    @keyframes meta-pop { 0% { transform: scale(.9); } 60% { transform: scale(1.05); } 100% { transform: scale(1); } }
    @media (prefers-reduced-motion: reduce) { .res, .res__next svg, .res__meta { animation: none; } }
  `,
})
export class TapResultComponent {
  readonly tap = input.required<ITap>();
  readonly run = input.required<ITapRun>();
  readonly topicName = input('este tema');
  /** Hay un Tap después (su primera pregunta asoma abajo, en .tap__peek). false = fin del feed. */
  readonly hasNext = input(false);
  readonly notice = input<{ text: string; download?: string } | null>(null);
  /** Partida enviada al ranking (undefined: no se envió, p. ej. en el prerender o un tema que el ranking aún no tiene). */
  readonly xp = input<TPartidaEstado | undefined>(undefined);
  /** Este Tap cumplió la meta del día: se celebra una vez al día (la racha y el «Hoy n/3» ya están en la barra). */
  readonly celebrar = input(false);
  /** Este Tap es el reto del día. */
  readonly reto = input<IRetoResultado | null>(null);
  /** Colección del subtema de este Tap (null en el servidor). */
  readonly coleccion = input<IAvanceColeccion | null>(null);
  /** Insignia ganada (o subida) con esta partida. */
  readonly coleccionNueva = input<TGrado | null>(null);
  /** Fin del feed: el reto del día para ofrecerlo (null si aún no se sabe). */
  readonly fin = input<IRetoVista | null>(null);

  readonly challenge = output<void>();
  readonly again = output<void>();
  readonly revancha = output<void>();
  readonly more = output<void>();
  readonly next = output<void>();
  readonly ranking = output<void>();
  readonly colecciones = output<void>();
  readonly irReto = output<void>();
  readonly temas = output<void>();
  readonly cursos = output<void>();

  protected readonly result = computed(() => resultFor(this.tap(), this.run().score));
  /** Una de las variantes de la línea, fija para esta partida (Tap + aciertos y fallos en orden). */
  protected readonly line = computed(() => lineaResultado(this.result(), `${this.tap().id}|${this.run().answers.map(a => (a ? 1 : 0)).join('')}`));
  /**
   * «Revancha: te falta 1 para "Leyenda del servidor"»: solo con 3/5 o 4/5 y si de verdad falta 1 acierto. En el primer
   * intento del reto del día no: ahí lo principal es retar a alguien con el mismo reto.
   */
  protected readonly casi = computed(() => {
    const r = this.reto();
    return r && !r.repeticion ? null : rematchGoal(this.tap(), this.run().score);
  });
  protected etiquetaReto(n: number): string { return retoLabel(n); }
}
