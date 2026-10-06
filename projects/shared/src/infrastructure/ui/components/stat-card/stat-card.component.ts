import { Component, computed, input } from '@angular/core';
import { CountUpDirective, RevealDirective } from '../../directives/motion';

export type StatAccent = 'primary' | 'teal' | 'success' | 'warning' | 'error' | 'neutral';

@Component({
  selector: 'lib-stat-card',
  imports: [CountUpDirective],
  hostDirectives: [{ directive: RevealDirective, inputs: ['revealIndex'] }],
  template: `
    <div class="stat-card lib-lift" [class]="'stat-card lib-lift stat-card--' + accent()">
      @if (icon()) {
        <span class="stat-card__icon" aria-hidden="true">{{ icon() }}</span>
      }
      <div class="stat-card__body">
        @if (numeric(); as n) {
          <span class="stat-card__value" [libCountUp]="n.value" [decimals]="n.decimals" [suffix]="n.suffix"></span>
        } @else {
          <span class="stat-card__value">{{ value() }}</span>
        }
        <span class="stat-card__label">{{ label() }}</span>
        @if (hint()) {
          <span class="stat-card__hint">{{ hint() }}</span>
        }
      </div>
    </div>
  `,
  styleUrl: './stat-card.component.scss'
})
export class StatCardComponent {
  readonly value = input.required<string | number>();
  readonly label = input.required<string>();
  readonly hint = input<string>('');
  readonly icon = input<string>('');
  readonly accent = input<StatAccent>('neutral');

  /** Valores como 42, "85%" o "4.5" cuentan hasta su cifra; el resto se muestra tal cual. */
  protected readonly numeric = computed(() => {
    const m = /^(d+(?:.(d+))?)(s*%?)$/.exec(String(this.value()).trim());
    return m ? { value: Number(m[1]), decimals: m[2]?.length ?? 0, suffix: m[3] } : null;
  });
}
