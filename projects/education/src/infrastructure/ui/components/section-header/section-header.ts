import { Component, input } from '@angular/core';

export type TSectionAccent = 'purple' | 'teal' | 'green';

@Component({
  selector: 'edu-section-header',
  template: `
    <div class="sheader">
      <h2 class="sheader__title">
        <span class="sheader__dot sheader__dot--{{ accent() }}"></span>
        {{ title() }}
      </h2>
      @if (count() !== undefined) {
        <span class="sheader__count">{{ count() }}</span>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      margin-bottom: var(--spacing-lg);
    }

    .sheader {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
    }

    .sheader__title {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-semibold);
      color: var(--color-texto-principal);
    }

    .sheader__dot {
      width: 8px;
      height: 8px;
      border-radius: var(--border-radius-full);
    }

    .sheader__dot--purple { background: var(--color-primario); }
    .sheader__dot--teal { background: var(--color-teal); }
    .sheader__dot--green { background: var(--color-exito); }

    .sheader__count {
      padding: 1px var(--spacing-sm);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-semibold);
      color: var(--color-texto-secundario);
      background: var(--color-tarjeta);
      border: 1px solid var(--color-borde-principal);
      border-radius: var(--border-radius-full);
    }
  `
})
export class SectionHeader {
  readonly title = input.required<string>();
  readonly accent = input<TSectionAccent>('purple');
  readonly count = input<number | undefined>(undefined);
}
