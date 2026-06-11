import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { IContentBlock, EContentType } from '../../../../domain/model/course.model';

export interface IAssignmentEntry {
  block: IContentBlock;
  lessonTitle: string;
  moduleTitle: string;
  submittedCount: number;
  pendingCount: number;
  gradedCount: number;
}

@Component({
  selector: 'edu-instructor-assignments-list',
  templateUrl: './instructor-assignments-list.html',
  styleUrl: './instructor-assignments-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstructorAssignmentsList {
  readonly assignments = input<IAssignmentEntry[]>([]);

  readonly selectAssignment = output<string>();

  protected readonly EContentType = EContentType;
}
