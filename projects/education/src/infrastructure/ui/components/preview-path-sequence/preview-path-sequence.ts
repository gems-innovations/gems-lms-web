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
}
