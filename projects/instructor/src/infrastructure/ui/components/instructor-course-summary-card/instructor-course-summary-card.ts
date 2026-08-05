import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { BadgeComponent } from 'shared';
import type { ICourse } from 'education';
import type { ICourseStats } from '../../../../domain/model/instructor.model';

export interface ICourseSummary {
  course: ICourse;
  groupCount: number;
  stats: ICourseStats;
}

@Component({
  selector: 'ins-course-summary-card',
  standalone: true,
  imports: [DecimalPipe, BadgeComponent],
  templateUrl: './instructor-course-summary-card.html',
  styleUrl: './instructor-course-summary-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstructorCourseSummaryCard {
  readonly summary = input.required<ICourseSummary>();
  readonly open    = output<ICourseSummary>();
}
