import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ILearningPath } from '../../../../domain/model/learning-path.model';
import { formatDuration } from '../../utils/course-labels';

@Component({
  selector: 'edu-path-player-hero',
  templateUrl: './path-player-hero.html',
  styleUrl: './path-player-hero.scss',
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PathPlayerHero {
  readonly path            = input.required<ILearningPath>();
  readonly overallProgress = input<number>(0);
  readonly completedCount  = input<number>(0);
  readonly isEnrolled      = input<boolean>(false);

  readonly goHome = output<void>();

  protected readonly CIRCUMFERENCE = 150.8; // 2π × 24

  protected formatDuration(min: number): string { return formatDuration(min); }
}
