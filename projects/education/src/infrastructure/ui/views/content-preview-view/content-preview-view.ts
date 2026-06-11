import {
  Component, input, output, computed, signal, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICourse, EDifficulty } from '../../../../domain/model/course.model';
import { ILearningPath } from '../../../../domain/model/learning-path.model';

export type TPreviewType = 'course' | 'path';

@Component({
  selector: 'edu-content-preview-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './content-preview-view.html',
  styleUrl: './content-preview-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContentPreviewView {
  readonly type        = input.required<TPreviewType>();
  readonly course      = input<ICourse | null>(null);
  readonly path        = input<ILearningPath | null>(null);
  readonly isEnrolled  = input(false);
  readonly isLoading   = input(false);
  readonly onEnroll    = output<void>();
  readonly onPlay      = output<void>();
  readonly onBack      = output<void>();

  readonly title = computed(() =>
    this.type() === 'course' ? this.course()?.title : this.path()?.title
  );
  readonly description = computed(() =>
    this.type() === 'course' ? this.course()?.description : this.path()?.description
  );
  readonly thumbnail = computed(() =>
    this.type() === 'course' ? this.course()?.thumbnailUrl : this.path()?.thumbnailUrl
  );
  readonly tags = computed(() =>
    this.type() === 'course' ? (this.course()?.tags ?? []) : (this.path()?.tags ?? [])
  );

  // Collapsible modules — all collapsed by default
  private readonly _expanded = signal<Set<string>>(new Set());

  isExpanded(id: string): boolean {
    return this._expanded().has(id);
  }

  toggleModule(id: string): void {
    this._expanded.update(s => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  formatDuration(min: number): string {
    if (!min) return '';
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h === 0) return `${m}m`;
    return m ? `${h}h ${m}m` : `${h}h`;
  }

  difficultyLabel(d: EDifficulty): string {
    const map: Record<EDifficulty, string> = {
      [EDifficulty.BEGINNER]: 'Principiante',
      [EDifficulty.INTERMEDIATE]: 'Intermedio',
      [EDifficulty.ADVANCED]: 'Avanzado',
      [EDifficulty.EXPERT]: 'Experto',
    };
    return map[d] ?? d;
  }

  lessonTypeLabel(type: string): string {
    const map: Record<string, string> = {
      video: 'Video', text: 'Texto', quiz: 'Quiz',
      assignment: 'Tarea', resource: 'Recurso'
    };
    return map[type] ?? type;
  }
}
