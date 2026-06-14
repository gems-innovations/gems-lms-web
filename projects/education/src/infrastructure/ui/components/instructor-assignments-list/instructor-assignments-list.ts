import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { EContentType } from '../../../../domain/model/course.model';
import { IAssignmentEntry } from '../../../../domain/model/instructor.model';

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
