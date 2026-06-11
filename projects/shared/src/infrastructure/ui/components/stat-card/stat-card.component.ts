import { Component, input } from '@angular/core';

export type StatAccent = 'primary' | 'teal' | 'success' | 'warning' | 'error' | 'neutral';

@Component({
  selector: 'lib-stat-card',
  template: `
    <div class="stat-card" [class]="'stat-card--' + accent()">
      @if (icon()) {
        <span class="stat-card__icon" aria-hidden="true">{{ icon() }}</span>
      }
      <div class="stat-card__body">
        <span class="stat-card__value">{{ value() }}</span>
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
}
