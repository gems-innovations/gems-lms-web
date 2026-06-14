import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICourse, EDifficulty } from '../../../../domain/model/course.model';
import { formatDuration } from '../../utils/course-labels';

@Component({
  selector: 'edu-home-popular-course-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home-popular-course-card.html',
  styleUrl: './home-popular-course-card.scss',
})
export class HomePopularCourseCard {
  readonly course = input.required<ICourse>();
  readonly open   = output<ICourse>();

  protected readonly EDifficulty = EDifficulty;

  protected readonly diffLabel: Record<EDifficulty, string> = {
    [EDifficulty.BEGINNER]:     'Principiante',
    [EDifficulty.INTERMEDIATE]: 'Intermedio',
    [EDifficulty.ADVANCED]:     'Avanzado',
    [EDifficulty.EXPERT]:       'Experto',
  };

  protected formatDuration = formatDuration;
}
