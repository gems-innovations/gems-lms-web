import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Riel lateral tipo TikTok, sobre el mundo y nunca encima de las opciones (experiencia-ux.md §3.1).
 * Solo lo que funciona hoy: «Más» (más Taps de este tema) y «Enviar» (compartir el Tap). Me gusta, comentar y guardar
 * se agregan cuando existan cuentas: un botón que no hace nada enseña a no tocar el riel.
 */
@Component({
  selector: 'gems-tap-rail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="rail" aria-label="Acciones del Tap">
      <button type="button" class="rail__btn" (click)="more.emit()" [attr.aria-label]="'Más Taps de ' + topicName()">
        <span class="gm-icono gm-icono--flotante rail__icon"><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M16.5 13.5v6M13.5 16.5h6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg></span>
        <span class="rail__label">Más</span>
      </button>
      <button type="button" class="rail__btn" (click)="share.emit()" aria-label="Compartir este Tap">
        <span class="gm-icono gm-icono--flotante rail__icon"><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M14 5l7 7-7 7M21 12H10a7 7 0 0 0-7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        <span class="rail__label">Enviar</span>
      </button>
    </nav>
  `,
  styleUrl: './tap-rail.component.scss',
})
export class TapRailComponent {
  readonly topicName = input('este tema');
  readonly more = output<void>();
  readonly share = output<void>();
}
