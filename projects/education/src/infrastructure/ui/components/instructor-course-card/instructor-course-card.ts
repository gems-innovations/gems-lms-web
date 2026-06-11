import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { ICourse } from '../../../../domain/model/course.model';

export interface ICourseStats {
  studentCount: number;
  avgProgress: number;
  avgGrade: number | null;
  pendingCount: number;
}

@Component({
  selector: 'edu-instructor-course-card',
  templateUrl: './instructor-course-card.html',
  styleUrl: './instructor-course-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstructorCourseCard {
  readonly course = input.required<ICourse>();
  readonly stats  = input.required<ICourseStats>();

  readonly open = output<string>();
}
