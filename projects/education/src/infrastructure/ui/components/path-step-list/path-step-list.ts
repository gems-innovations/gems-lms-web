import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { IStepEntry } from '../../../../domain/model/learning-path.model';
import { formatDuration } from '../../utils/course-labels';

@Component({
  selector: 'edu-path-step-list',
  templateUrl: './path-step-list.html',
  styleUrl: './path-step-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PathStepList {
  readonly stepEntries = input<IStepEntry[]>([]);

  readonly startCourse = output<IStepEntry>();

  protected formatDuration(min: number): string { return formatDuration(min); }
}
