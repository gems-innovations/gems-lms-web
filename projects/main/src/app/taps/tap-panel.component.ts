import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { IPanelCard, TPanelState } from './taps.panel';

/**
 * Panel contextual (escritorio.md §7): a la derecha del riel en ≥ 1024 px, franja bajo el escenario en 768–1023 y oculto en móvil.
 * Muestra hasta 3 tarjetas del momento del Tap. «Respira»: al 72 % mientras hay una pregunta sin responder y al 100 % al
 * responder, con el puntero encima o con foco dentro. Presentacional: las tarjetas las calcula `taps.panel.ts`.
 */
@Component({
  selector: 'gems-tap-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="panel" [attr.data-estado]="state()" aria-label="Para seguir jugando">
      <div class="panel__cards">
        @for (c of cards(); track c.id) {
          <section class="card" [class.card--soft]="$index > 0" [attr.aria-labelledby]="'pc-' + c.id">
            <h2 class="card__title" [id]="'pc-' + c.id">{{ c.title }}</h2>
            @if (c.ring) {
              <div class="card__row">
                <svg class="card__ring" viewBox="0 0 36 36" width="52" height="52" aria-hidden="true">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="4"/>
                  <circle cx="18" cy="18" r="15" fill="none" [attr.stroke]="c.ring.color" stroke-width="4" stroke-linecap="round" pathLength="100"
                          [attr.stroke-dasharray]="(c.ring.total ? c.ring.done / c.ring.total * 100 : 0) + ' 100'" transform="rotate(-90 18 18)"/>
                </svg>
                <p class="card__big">{{ c.big }}</p>
              </div>
            } @else if (c.big) {
              <p class="card__big">{{ c.big }}</p>
            }
            @if (c.next; as n) {
              <div class="card__next" [style.--a]="n.backdrop[0]" [style.--b]="n.backdrop[1]">
                <span class="card__poster" aria-hidden="true"></span>
                <p class="card__nextname">{{ n.title }}<small>{{ n.kicker }}</small></p>
              </div>
            }
            @if (c.body) { <p class="card__body">{{ c.body }}</p> }
            @if (c.cta; as cta) { <button type="button" class="card__cta" (click)="go.emit(cta.action)">{{ cta.label }}</button> }
            @if (c.link; as l) { <button type="button" class="card__link" (click)="go.emit(l.action)" aria-haspopup="dialog">{{ l.label }}</button> }
            @if (c.note) { <p class="card__note">{{ c.note }}</p> }
          </section>
        }
      </div>

      <div class="keys">
        <button type="button" class="keys__help" (click)="legend.set(!legend())" [attr.aria-expanded]="legend()" aria-controls="taps-atajos" aria-label="Ver atajos de teclado">?</button>
        <div id="taps-atajos" class="keys__list" [class.is-open]="legend()">
          <p class="keys__title">Atajos de teclado</p>
          <dl>
            <div><dt><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> <kbd>4</kbd></dt><dd>Responder</dd></div>
            <div><dt><kbd>↑</kbd> <kbd>↓</kbd></dt><dd>Cambiar de Tap</dd></div>
            <div><dt><kbd>Espacio</kbd></dt><dd>Seguir</dd></div>
            <div><dt><kbd>R</kbd></dt><dd>Retar a un amigo</dd></div>
            <div><dt><kbd>M</kbd></dt><dd>Sonido (todo)</dd></div>
            <div><dt><kbd>F</kbd></dt><dd>Modo enfoque</dd></div>
            <div><dt><kbd>[</kbd></dt><dd>Menú</dd></div>
          </dl>
          <button type="button" class="keys__off" (click)="toggleKeys.emit()">{{ keysOn() ? 'Apagar atajos' : 'Encender atajos' }}</button>
        </div>
      </div>
    </aside>
  `,
  styleUrl: './tap-panel.component.scss',
})
export class TapPanelComponent {
  readonly cards = input<IPanelCard[]>([]);
  readonly state = input<TPanelState>('pregunta');
  readonly keysOn = input(true);

  readonly go = output<'next' | 'ranking'>();
  readonly toggleKeys = output<void>();

  /** Leyenda de atajos abierta (tecla «?»); en ≥ 1280 px está siempre a la vista. */
  readonly legend = model(false);
}
