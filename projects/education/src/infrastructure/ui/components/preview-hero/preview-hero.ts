import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { ICourse, EDifficulty } from '../../../../domain/model/course.model';
import { ILearningPath } from '../../../../domain/model/learning-path.model';
import { DIFFICULTY_LABELS, formatDuration } from '../../utils/course-labels';

export type TPreviewType = 'course' | 'path';

@Component({
  selector: 'edu-preview-hero',
  templateUrl: './preview-hero.html',
  styleUrl: './preview-hero.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewHero {
  readonly type       = input.required<TPreviewType>();
  readonly course     = input<ICourse | null>(null);
  readonly path       = input<ILearningPath | null>(null);
  readonly isEnrolled = input<boolean>(false);

  readonly enroll = output<void>();
  readonly play   = output<void>();
  readonly back   = output<void>();

  protected readonly title       = computed(() => this.type() === 'course' ? this.course()?.title : this.path()?.title);
  protected readonly description = computed(() => this.type() === 'course' ? this.course()?.description : this.path()?.description);
  protected readonly thumbnail   = computed(() => this.type() === 'course' ? this.course()?.thumbnailUrl : this.path()?.thumbnailUrl);
  protected readonly tags        = computed(() => this.type() === 'course' ? (this.course()?.tags ?? []) : (this.path()?.tags ?? []));

  protected difficultyLabel(d: EDifficulty): string { return DIFFICULTY_LABELS[d] ?? d; }
  protected formatDuration(min: number): string { return formatDuration(min); }
}
