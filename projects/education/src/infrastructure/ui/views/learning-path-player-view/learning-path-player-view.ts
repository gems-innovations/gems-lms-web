import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ILearningPath } from '../../../../domain/model/learning-path.model';
import { ILearningPathStep } from '../../../../domain/model/learning-path.model';

export interface IStepEntry {
  step: ILearningPathStep;
  isCompleted: boolean;
  isCurrent: boolean;
  isLocked: boolean;
}

@Component({
  selector: 'edu-learning-path-player-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './learning-path-player-view.html',
  styleUrl: './learning-path-player-view.scss'
})
export class LearningPathPlayerView {
  // ── Inputs ───────────────────────────────────────────────────────────────────
  readonly learningPath    = input<ILearningPath | null>(null);
  readonly stepEntries     = input<IStepEntry[]>([]);
  readonly overallProgress = input<number>(0);
  readonly completedCount  = input<number>(0);
  readonly isEnrolled      = input<boolean>(false);
  readonly isLoading       = input<boolean>(false);

  // ── Outputs ──────────────────────────────────────────────────────────────────
  readonly onStartCourse = output<IStepEntry>();
  readonly onGoHome      = output<void>();

  // ── Display helpers ───────────────────────────────────────────────────────────
  formatDuration(minutes: number): string {
    if (!minutes) return '—';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m} min`;
  }

  formatProgress(n: number): string { return `${Math.round(n)}%`; }

  trackByStepId(_: number, entry: IStepEntry): string { return entry.step.id; }
}
