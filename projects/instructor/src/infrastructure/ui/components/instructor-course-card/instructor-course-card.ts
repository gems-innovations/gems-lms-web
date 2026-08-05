import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { BadgeComponent } from 'shared';
import type { ICohort } from '../../../../domain/model/instructor.model';

@Component({
  selector: 'ins-course-card',
  standalone: true,
  imports: [DecimalPipe, BadgeComponent],
  templateUrl: './instructor-course-card.html',
  styleUrl: './instructor-course-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstructorCourseCard {
  readonly cohort = input.required<ICohort>();
  readonly open   = output<ICohort>();
}
