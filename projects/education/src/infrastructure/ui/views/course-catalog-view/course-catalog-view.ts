import {
  Component, input, output, signal, computed, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICourse, EDifficulty, ECourseStatus } from '../../../../domain/model/course.model';
import { ILearningPath, ELearningPathStatus } from '../../../../domain/model/learning-path.model';

export interface ICatalogEnrollAction { courseId: string; }
export interface ICatalogItem {
  kind: 'course' | 'path';
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  tags: string[];
  duration: number;
  meta: string;        // e.g. "8 lecciones · Intermedio" or "3 cursos"
  difficulty?: EDifficulty;
}

@Component({
  selector: 'edu-course-catalog-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './course-catalog-view.html',
  styleUrl: './course-catalog-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseCatalogView {
  readonly courses       = input<ICourse[]>([]);
  readonly paths         = input<ILearningPath[]>([]);
  readonly enrolledIds   = input<string[]>([]);
  readonly enrolledPathIds = input<string[]>([]);
  readonly isLoading     = input(false);
  readonly onEnroll      = output<ICatalogEnrollAction>();
  readonly onOpenCourse  = output<string>();
  readonly onPreview     = output<{ kind: 'course' | 'path'; id: string }>();

  readonly search      = signal('');
  readonly filterLevel = signal<EDifficulty | 'all'>('all');
  readonly filterKind  = signal<'all' | 'course' | 'path'>('all');
  readonly filterOpen  = signal(false);

  toggleFilter(): void { this.filterOpen.update(v => !v); }
  closeFilter(): void  { this.filterOpen.set(false); }

  readonly activeFilterCount = computed(() => {
    let n = 0;
    if (this.filterKind()  !== 'all') n++;
    if (this.filterLevel() !== 'all') n++;
    return n;
  });

  readonly EDifficulty = EDifficulty;

  readonly allItems = computed<ICatalogItem[]>(() => {
    const courseItems: ICatalogItem[] = this.courses()
      .filter(c => c.status === ECourseStatus.PUBLISHED)
      .map(c => ({
        kind: 'course',
        id: c.id,
        title: c.title,
        description: c.description,
        thumbnailUrl: c.thumbnailUrl,
        tags: c.tags,
        duration: c.totalDuration,
        difficulty: c.difficulty,
        meta: `${c.totalLessons} lecciones · ${this.difficultyLabel(c.difficulty)}`
      }));

    const pathItems: ICatalogItem[] = this.paths()
      .filter(p => p.status === ELearningPathStatus.PUBLISHED)
      .map(p => ({
        kind: 'path',
        id: p.id,
        title: p.title,
        description: p.description,
        thumbnailUrl: p.thumbnailUrl,
        tags: p.tags,
        duration: p.estimatedDuration,
        meta: `${p.steps.length} curso(s) · ${p.enrolledCount} inscritos`
      }));

    return [...courseItems, ...pathItems];
  });

  readonly filtered = computed(() => {
    const q    = this.search().toLowerCase();
    const lvl  = this.filterLevel();
    const kind = this.filterKind();
    return this.allItems().filter(item => {
      if (kind !== 'all' && item.kind !== kind) return false;
      if (q && !item.title.toLowerCase().includes(q) && !item.description.toLowerCase().includes(q)) return false;
      if (lvl !== 'all' && item.difficulty !== lvl) return false;
      return true;
    });
  });

  isEnrolled(item: ICatalogItem): boolean {
    return item.kind === 'course'
      ? this.enrolledIds().includes(item.id)
      : this.enrolledPathIds().includes(item.id);
  }

  enroll(item: ICatalogItem): void {
    if (item.kind === 'course') {
      this.onEnroll.emit({ courseId: item.id });
    } else {
      this.onEnroll.emit({ courseId: item.id }); // reuse same event, container distinguishes by kind
    }
  }

  difficultyLabel(d: EDifficulty | null): string {
    if (!d) return '';

    const map: Record<EDifficulty, string> = {
      [EDifficulty.BEGINNER]:     'Principiante',
      [EDifficulty.INTERMEDIATE]: 'Intermedio',
      [EDifficulty.ADVANCED]:     'Avanzado',
      [EDifficulty.EXPERT]:       'Experto',
    };
    return map[d] ?? d;
  }

  formatDuration(min: number): string {
    if (!min) return '—';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
}
