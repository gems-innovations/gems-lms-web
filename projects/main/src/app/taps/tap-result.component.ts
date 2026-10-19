import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { resultFor } from './taps.logic';
import { TPartidaEstado } from './taps.ranking';
import { TapXpComponent } from './tap-xp.component';
import { ITap, ITapRun } from './taps.types';

/**
 * Resultado de un Tap (experiencia-ux.md §5.5): título que nunca es negativo, cuadrícula de aciertos sin spoilers
 * (patrón Wordle) y «Retar a un amigo» como botón principal. El resultado no avanza solo: es el momento de compartir.
 * Bajo la línea va la tarjeta de XP y ranking (solo con datos reales del API; sin ellos no aparece).
 */
@Component({
  selector: 'gems-tap-result',
  imports: [RouterLink, TapXpComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="res">
      <p class="res__over">Tu título</p>
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
      <p class="res__line">{{ result().line }}</p>
      @if (xp()) { <gems-tap-xp [estado]="xp()" (ranking)="ranking.emit()" /> }

      <button type="button" class="res__main" (click)="challenge.emit()">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M14 5l7 7-7 7M21 12H10a7 7 0 0 0-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Retar a un amigo
      </button>
      @if (notice(); as n) {
        <p class="res__notice" role="status">{{ n.text }}
          @if (n.download) { <a [href]="n.download" [attr.download]="'gems-taps-' + tap().id + '.png'">Descargar imagen</a> }
        </p>
      }
      <div class="res__row">
        <button type="button" class="res__ghost" (click)="again.emit()">Repetir</button>
        <button type="button" class="res__ghost" (click)="more.emit()">Más de {{ topicName() }}</button>
      </div>
      @if (hasNext()) {
        <button type="button" class="res__next" (click)="next.emit()">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="m6 15 6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Desliza para el siguiente tema
        </button>
      } @else {
        <a class="res__next" routerLink="/">Ver los cursos gratis de GEMS LMS</a>
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .res { padding: 18px 16px 14px; border-radius: 22px; background: rgba(22, 27, 36, .94); border: 1px solid rgba(255, 255, 255, .1); text-align: center; animation: res-in .5s cubic-bezier(.2, 1.3, .4, 1); }
    .res__over { margin: 0; font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #aab4c4; }
    .res__title { margin: 4px 0 2px; outline: none; font-size: clamp(1.75rem, 8vw, 2.25rem); font-weight: 800; letter-spacing: -.01em; line-height: 1.08; color: #fff; text-wrap: balance; }
    .res__score { margin: 0 0 12px; font-size: 1rem; font-weight: 700; color: #c8d1de; font-variant-numeric: tabular-nums; }
    .res__theme { font-family: var(--tap-display-font, inherit); }
    .res__grid { display: flex; justify-content: center; gap: 8px; margin: 0 0 10px; padding: 0; list-style: none;
      li { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 8px; background: #3a4150; color: #fff; }
      .is-ok { background: #2FBF71; color: #06210f; }
      .is-bad { background: #D1343A; } }
    .res__line { margin: 0 0 14px; font-size: 1rem; line-height: 1.4; color: #dfe6ef; }
    .res__main, .res__ghost, .res__next { font: inherit; cursor: pointer; }
    .res__main { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; min-height: 56px; border: 0; border-radius: 16px;
      font-size: 1.125rem; font-weight: 800; color: #10141b; background: #f3f5f8; box-shadow: 0 4px 0 #9aa3b2;
      &:active { transform: translateY(2px); box-shadow: 0 2px 0 #9aa3b2; } }
    .res__notice { margin: 10px 0 0; font-size: 1rem; overflow-wrap: anywhere; color: #dfe6ef; a { margin-left: 6px; color: #9fd0ff; font-weight: 700; } }
    .res__row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
    .res__ghost { min-height: 50px; padding: 6px 8px; border-radius: 14px; font-size: 1rem; font-weight: 700; color: #fff; background: transparent; border: 1.5px solid rgba(255, 255, 255, .26); }
    .res__next { display: flex; flex-direction: column; align-items: center; gap: 2px; width: 100%; min-height: 48px; margin-top: 8px; padding: 4px; border: 0; background: none;
      font-size: 1rem; font-weight: 700; color: #c8d1de; text-decoration: none;
      svg { animation: res-bounce 1.6s ease-in-out 2s 3; } }
    button:focus-visible, a:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
    @keyframes res-in { from { opacity: 0; transform: translateY(18px) scale(.97); } }
    @keyframes res-bounce { 0%, 100% { transform: translateY(0); } 40% { transform: translateY(-7px); } }
    @media (prefers-reduced-motion: reduce) { .res, .res__next svg { animation: none; } }
  `,
})
export class TapResultComponent {
  readonly tap = input.required<ITap>();
  readonly run = input.required<ITapRun>();
  readonly topicName = input('este tema');
  readonly hasNext = input(false);
  readonly notice = input<{ text: string; download?: string } | null>(null);
  /** Partida enviada al ranking (undefined: no se envió, p. ej. en el prerender o un tema que el ranking aún no tiene). */
  readonly xp = input<TPartidaEstado | undefined>(undefined);

  readonly challenge = output<void>();
  readonly again = output<void>();
  readonly more = output<void>();
  readonly next = output<void>();
  readonly ranking = output<void>();

  protected readonly result = computed(() => resultFor(this.tap(), this.run().score));
}
