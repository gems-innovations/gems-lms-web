import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { ILearningPath } from '../../../../domain/model/learning-path.model';
import { formatDuration } from '../../utils/course-labels';

@Component({
  selector: 'edu-preview-path-sequence',
  templateUrl: './preview-path-sequence.html',
  styleUrl: './preview-path-sequence.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewPathSequence {
  readonly path = input.required<ILearningPath>();

  protected formatDuration(min: number): string { return formatDuration(min); }

  protected stars(rating: number): string[] {
    return [1, 2, 3, 4, 5].map(i =>
      i <= Math.floor(rating) ? 'full' : (i - rating < 1 ? 'half' : 'empty')
    );
  }

  protected formatRatingCount(n: number): string {
    return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;
  }
}
