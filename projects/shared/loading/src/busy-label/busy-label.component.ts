import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Etiqueta de botón con estado «trabajando» que NO cambia el tamaño del botón: el texto normal y el de espera
 * ocupan la misma celda de la cuadrícula (el botón mide lo que el más largo de los dos), así que pasar de
 * «Empezar gratis» a «Entrando…» no mueve nada alrededor.
 *
 * El cambio visual (spinner + texto de espera) entra a los 300 ms: si la acción termina antes, no hay parpadeo.
 * Va DENTRO de cualquier botón (también los `.btn` de las páginas públicas):
 *
 *   <button class="btn btn--primary" [disabled]="entrando()" [attr.aria-busy]="entrando()">
 *     <lib-busy-label [busy]="entrando()" busyText="Entrando…">Empezar gratis</lib-busy-label>
 *   </button>
 */
@Component({
  selector: 'lib-busy-label',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.bl--busy]': 'busy()' },
  template: `
    <span class="bl__idle" [attr.aria-hidden]="busy() ? 'true' : null"><ng-content /></span>
    <span class="bl__busy" [attr.aria-hidden]="busy() ? null : 'true'">
      <svg class="bl__spin" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="3" opacity=".25" />
        <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
      </svg>{{ busyText() }}
    </span>
  `,
  styles: [`
    :host { display: inline-grid; place-items: center; }
    .bl__idle, .bl__busy { grid-area: 1 / 1; display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; }
    .bl__busy { visibility: hidden; }
    :host(.bl--busy) .bl__idle { animation: bl-out 0s linear var(--bl-delay, 300ms) forwards; }
    :host(.bl--busy) .bl__busy { animation: bl-in var(--dur-base, 200ms) var(--curva-estandar, ease) var(--bl-delay, 300ms) forwards; }
    .bl__spin { flex: none; animation: bl-spin 0.8s linear infinite; }
    @keyframes bl-out { to { visibility: hidden; } }
    @keyframes bl-in { from { visibility: visible; opacity: 0; } to { visibility: visible; opacity: 1; } }
    @keyframes bl-spin { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { .bl__spin { animation: none; } }
  `],
})
export class BusyLabelComponent {
  /** true mientras la acción está en curso. */
  readonly busy = input(false);
  /** Texto mientras trabaja («Guardando…», «Entrando…»). */
  readonly busyText = input('Cargando…');
}
