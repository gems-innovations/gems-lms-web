import { Component, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ICourse, ECourseStatus } from '../../../../domain/model/course.model';
import { DIFFICULTY_LABELS, STATUS_LABELS, formatDuration } from '../../utils/course-labels';

@Component({
  selector: 'edu-course-card',
  imports: [DecimalPipe],
  templateUrl: './course-card.html',
  styleUrl: './course-card.scss'
})
export class CourseCard {
  readonly course = input.required<ICourse>();

  readonly publish = output<string>();
  readonly archive = output<string>();
  readonly edit = output<ICourse>();
  readonly remove = output<string>();

  protected readonly ECourseStatus = ECourseStatus;
  protected readonly difficultyLabels = DIFFICULTY_LABELS;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly formatDuration = formatDuration;
}
