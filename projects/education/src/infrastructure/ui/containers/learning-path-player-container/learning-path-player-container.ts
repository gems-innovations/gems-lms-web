import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LearningPathUseCase } from '../../../../application/learning-path.usecase';
import { EnrollmentUseCase } from '../../../../application/enrollment.usecase';
import { CourseUseCase } from '../../../../application/course.usecase';
import { LearningPathPlayerView } from '../../views/learning-path-player-view/learning-path-player-view';
import type { IStepEntry } from '../../views/learning-path-player-view/learning-path-player-view';

@Component({
  selector: 'edu-learning-path-player-container',
  standalone: true,
  imports: [LearningPathPlayerView],
  templateUrl: './learning-path-player-container.html'
})
export class LearningPathPlayerContainer implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly lpUc = inject(LearningPathUseCase);
  private readonly enrollmentUc = inject(EnrollmentUseCase);
  private readonly courseUc = inject(CourseUseCase);

  readonly pathId = signal<string | null>(null);

  // ── Derived ───────────────────────────────────────────────────────────────────
  readonly learningPath = computed(() => {
    const id = this.pathId();
    return id ? this.lpUc.learningPaths().find(lp => lp.id === id) ?? null : null;
  });

  readonly pathEnrollment = computed(() => {
    const id = this.pathId();
    if (!id) return null;
    return this.enrollmentUc.pathEnrollments().find(e => e.learningPathId === id) ?? null;
  });

  readonly isEnrolled = computed(() => !!this.pathEnrollment());

  readonly stepEntries = computed((): IStepEntry[] => {
    const path = this.learningPath();
    const enrollment = this.pathEnrollment();
    if (!path) return [];

    const completedIds = new Set(enrollment?.completedCourseIds ?? []);

    return path.steps.map((step, idx) => {
      const isCompleted = completedIds.has(step.courseId);
      const isCurrent = enrollment?.currentCourseId === step.courseId;
      const prevRequired = path.steps.slice(0, idx).filter(s => s.isRequired);
      const isLocked = prevRequired.some(s => !completedIds.has(s.courseId));
      return { step, isCompleted, isCurrent, isLocked };
    });
  });

  readonly overallProgress = computed(() => this.pathEnrollment()?.overallPercentage ?? 0);
  readonly completedCount  = computed(() => this.stepEntries().filter(e => e.isCompleted).length);
  readonly isLoading       = computed(() => this.lpUc.isLoading() || this.courseUc.isLoading());

  // ── Lifecycle ─────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.pathId.set(id);
    if (this.lpUc.learningPaths().length === 0) this.lpUc.load();
    if (this.enrollmentUc.pathEnrollments().length === 0) this.enrollmentUc.loadPathEnrollments();
    if (this.courseUc.courses().length === 0) this.courseUc.load();
  }

  // ── Event handlers ────────────────────────────────────────────────────────────
  startCourse(entry: IStepEntry): void {
    if (!entry.isLocked) {
      this.router.navigate(['/learn/courses', entry.step.courseId]);
    }
  }

  goHome(): void { this.router.navigate(['/learn/home']); }
}
