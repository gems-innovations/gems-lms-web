import { inject, Injectable, signal, computed } from '@angular/core';
import { LearningPathUseCase } from './learning-path.usecase';
import { EnrollmentUseCase } from './enrollment.usecase';
import { CourseUseCase } from './course.usecase';
import { IStepEntry } from '../domain/model/learning-path.model';

@Injectable({ providedIn: 'root' })
export class LearningPathPlayerUseCase {
  private readonly lpUc         = inject(LearningPathUseCase);
  private readonly enrollmentUc = inject(EnrollmentUseCase);
  private readonly courseUc     = inject(CourseUseCase);

  private readonly _pathId = signal<string | null>(null);

  readonly isLoading = computed(() => this.lpUc.isLoading() || this.courseUc.isLoading());

  readonly learningPath = computed(() => {
    const id = this._pathId();
    return id ? this.lpUc.learningPaths().find(lp => lp.id === id) ?? null : null;
  });

  readonly pathEnrollment = computed(() => {
    const id = this._pathId();
    if (!id) return null;
    return this.enrollmentUc.pathEnrollments().find(e => e.learningPathId === id) ?? null;
  });

  readonly isEnrolled    = computed(() => !!this.pathEnrollment());
  readonly overallProgress = computed(() => this.pathEnrollment()?.overallPercentage ?? 0);

  readonly stepEntries = computed((): IStepEntry[] => {
    const path       = this.learningPath();
    const enrollment = this.pathEnrollment();
    if (!path) return [];
    const completedIds = new Set(enrollment?.completedCourseIds ?? []);
    return path.steps.map((step, idx) => {
      const isCompleted  = completedIds.has(step.courseId);
      const isCurrent    = enrollment?.currentCourseId === step.courseId;
      const prevRequired = path.steps.slice(0, idx).filter(s => s.isRequired);
      const isLocked     = prevRequired.some(s => !completedIds.has(s.courseId));
      return { step, isCompleted, isCurrent, isLocked };
    });
  });

  readonly completedCount = computed(() => this.stepEntries().filter(e => e.isCompleted).length);

  init(pathId: string): void {
    this._pathId.set(pathId);
    if (this.lpUc.learningPaths().length === 0)           this.lpUc.load();
    if (this.enrollmentUc.pathEnrollments().length === 0) this.enrollmentUc.loadPathEnrollments();
    if (this.courseUc.courses().length === 0)             this.courseUc.load();
  }
}
