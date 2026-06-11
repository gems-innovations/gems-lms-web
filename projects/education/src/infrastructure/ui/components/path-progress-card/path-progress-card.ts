import { Component, computed, input, output } from '@angular/core';
import { IEnrolledPathEntry } from '../../../../domain/model/enrollment.model';
import { formatDuration } from '../../utils/course-labels';

@Component({
  selector: 'edu-path-progress-card',
  template: `
    <article class="ppcard" (click)="open.emit(entry().path.id)">
      <div class="ppcard__icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/>
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
          <line x1="12" y1="22.08" x2="12" y2="12"/>
        </svg>
      </div>
      <div class="ppcard__info">
        <span class="ppcard__title">{{ entry().path.title }}</span>
        <span class="ppcard__meta">
          {{ entry().path.steps.length }} cursos &nbsp;·&nbsp; {{ duration() }}
        </span>
        <div class="ppcard__progress-wrap">
          <div class="ppcard__progress-bar">
            <div class="ppcard__progress-fill" [style.width]="progressPct()"></div>
          </div>
          <span class="ppcard__progress-pct">{{ progressPct() }}</span>
        </div>
      </div>
      <svg class="ppcard__arrow" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </article>
  `,
  styleUrl: './path-progress-card.scss'
})
export class PathProgressCard {
  readonly entry = input.required<IEnrolledPathEntry>();

  readonly open = output<string>();

  protected readonly progressPct = computed(
    () => `${Math.round(this.entry().enrollment.overallPercentage)}%`
  );

  protected readonly duration = computed(() =>
    formatDuration(this.entry().path.estimatedDuration)
  );
}
