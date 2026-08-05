import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AvatarComponent } from 'shared';
import type { IStudentReview } from '../../../../domain/model/review.model';

@Component({
  selector: 'ins-review-card',
  standalone: true,
  imports: [DatePipe, AvatarComponent],
  templateUrl: './review-card.html',
  styleUrl: './review-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewCard {
  readonly review = input.required<IStudentReview>();

  protected readonly stars = computed(() =>
    Array.from({ length: 5 }, (_, i) => i < this.review().rating)
  );
}
