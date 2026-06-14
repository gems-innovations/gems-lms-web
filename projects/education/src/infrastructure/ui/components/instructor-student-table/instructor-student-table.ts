import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { IStudentProfile } from '../../../services/enrollment.service';
import { IEnrollmentRow } from '../../../../domain/model/instructor.model';

@Component({
  selector: 'edu-instructor-student-table',
  templateUrl: './instructor-student-table.html',
  styleUrl: './instructor-student-table.scss',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstructorStudentTable {
  readonly enrollments = input<IEnrollmentRow[]>([]);

  protected initials(s: IStudentProfile): string {
    return (s.firstName[0] + s.lastName[0]).toUpperCase();
  }
}
