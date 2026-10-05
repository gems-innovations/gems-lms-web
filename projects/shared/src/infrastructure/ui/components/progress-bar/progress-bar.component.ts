import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ProgressVariant = 'primary' | 'success' | 'warning' | 'danger';
export type ProgressSize    = 'xs' | 'sm' | 'md';

@Component({
  selector: 'lib-progress-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './progress-bar.component.html',
  styleUrl: './progress-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProgressBarComponent {
  readonly value     = input<number>(0);
  readonly max       = input<number>(100);
  readonly variant   = input<ProgressVariant>('primary');
  readonly size      = input<ProgressSize>('sm');
  readonly showLabel = input<boolean>(false);
  readonly animated  = input<boolean>(false);
  /** What the bar measures, for screen readers (e.g. "Avance de Docker"). */
  readonly label     = input<string>('Progreso');

  readonly percentage = computed(() => {
    const pct = Math.min(Math.max((this.value() / this.max()) * 100, 0), 100);
    return Math.round(pct);
  });
}
