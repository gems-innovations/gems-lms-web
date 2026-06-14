import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { ICourse } from '../../../../domain/model/course.model';
import { ICourseStats } from '../../../../domain/model/instructor.model';

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
