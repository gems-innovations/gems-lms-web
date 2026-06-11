import { Component, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ICourse, ECourseStatus, EDifficulty } from '../../../../domain/model/course.model';
import type { TCourseModalMode } from '../../../../application/course.usecase';

export interface ICourseStats {
  total: number;
  published: number;
  draft: number;
  totalEnrolled: number;
}

export interface ICourseModalState {
  isOpen: boolean;
  mode: TCourseModalMode;
  courseId: string | null;
}

@Component({
  selector: 'edu-course-list-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './course-list-view.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './course-list-view.scss'
})
export class CourseListView {
  // ── Inputs ───────────────────────────────────────────────────────────────────
  readonly filteredCourses = input<ICourse[]>([]);
  readonly stats           = input<ICourseStats>({ total: 0, published: 0, draft: 0, totalEnrolled: 0 });
  readonly isLoading       = input<boolean>(false);
  readonly isDeleting      = input<boolean>(false);
  readonly modal           = input<ICourseModalState>({ isOpen: false, mode: null, courseId: null });
  readonly selectedCourse  = input<ICourse | null>(null);

  // ── Outputs ──────────────────────────────────────────────────────────────────
  readonly onSearch        = output<string>();
  readonly onTabChange     = output<ECourseStatus | null>();
  readonly onOpenEditor    = output<ICourse>();
  readonly onCreateCourse  = output<void>();
  readonly onDelete        = output<string>();
  readonly onPublish       = output<string>();
  readonly onArchive       = output<string>();
  readonly onModalClose    = output<void>();
  readonly onConfirmDelete = output<string>();

  // ── Local UI state ────────────────────────────────────────────────────────────
  readonly activeTab   = signal<ECourseStatus | null>(null);
  readonly searchValue = signal('');

  readonly ECourseStatus = ECourseStatus;
  readonly EDifficulty   = EDifficulty;

  readonly difficultyLabels: Record<EDifficulty, string> = {
    [EDifficulty.BEGINNER]:     'Principiante',
    [EDifficulty.INTERMEDIATE]: 'Intermedio',
    [EDifficulty.ADVANCED]:     'Avanzado',
    [EDifficulty.EXPERT]:       'Experto'
  };

  readonly statusLabels: Record<ECourseStatus, string> = {
    [ECourseStatus.DRAFT]:      'Borrador',
    [ECourseStatus.PUBLISHED]:  'Publicado',
    [ECourseStatus.ARCHIVED]:   'Archivado'
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────
  search(term: string): void {
    this.searchValue.set(term);
    this.onSearch.emit(term);
  }

  setTab(status: ECourseStatus | null): void {
    this.activeTab.set(status);
    this.onTabChange.emit(status);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes}min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }

  trackById(_: number, item: ICourse): string { return item.id; }
}
