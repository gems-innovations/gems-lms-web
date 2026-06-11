import { Component, computed, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { IEnrolledCourseEntry } from '../../../../domain/model/enrollment.model';

@Component({
  selector: 'edu-course-progress-card',
  imports: [DatePipe],
  templateUrl: './course-progress-card.html',
  styleUrl: './course-progress-card.scss'
})
export class CourseProgressCard {
  readonly entry = input.required<IEnrolledCourseEntry>();

  readonly open = output<IEnrolledCourseEntry>();

  protected readonly isDone = computed(() => this.entry().enrollment.status === 'completed');

  protected readonly progressPct = computed(() => {
    if (this.isDone()) return '100%';
    return `${Math.round(this.entry().enrollment.progress.overallPercentage)}%`;
  });
}
