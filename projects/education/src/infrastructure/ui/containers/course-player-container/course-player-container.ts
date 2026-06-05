import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CourseUseCase } from '../../../../application/course.usecase';
import { EnrollmentUseCase } from '../../../../application/enrollment.usecase';
import { CoursePlayerView } from '../../views/course-player-view/course-player-view';
import type { IQuizSubmitPayload, IAssignmentSubmitPayload } from '../../views/course-player-view/course-player-view';

@Component({
  selector: 'edu-course-player-container',
  standalone: true,
  imports: [CoursePlayerView],
  templateUrl: './course-player-container.html'
})
export class CoursePlayerContainer implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly courseUc = inject(CourseUseCase);
  private readonly enrollmentUc = inject(EnrollmentUseCase);

  // ── Route state ───────────────────────────────────────────────────────────────
  readonly courseId = signal<string | null>(null);
  readonly initialLessonId: string | null;
  readonly initialBlockId: string | null;

  // ── Derived ───────────────────────────────────────────────────────────────────
  readonly course = computed(() => {
    const id = this.courseId();
    return id ? this.courseUc.courses().find(c => c.id === id) ?? null : null;
  });

  readonly enrollment = computed(() => {
    const id = this.courseId();
    return id ? this.enrollmentUc.getEnrollmentByCourse(id) : null;
  });

  readonly isSubmitting  = computed(() => this.enrollmentUc.isSubmitting());
  readonly lastQuizResult = computed(() => this.enrollmentUc.lastQuizResult());

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    this.courseId.set(id);
    this.initialLessonId = this.route.snapshot.queryParams['lesson'] ?? null;
    this.initialBlockId  = this.route.snapshot.queryParams['block'] ?? null;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    if (this.courseUc.courses().length === 0) this.courseUc.load();
    if (this.enrollmentUc.enrollments().length === 0) this.enrollmentUc.loadEnrollments();
  }

  // ── Event handlers (from view) ────────────────────────────────────────────────
  handleLessonSelected(lessonId: string): void {
    const enrollment = this.enrollment();
    if (!enrollment) return;
    this.enrollmentUc.updateProgress(enrollment.id, lessonId, '');
  }

  handleQuizSubmit(payload: IQuizSubmitPayload): void {
    this.enrollmentUc.submitQuiz(payload);
  }

  handleAssignmentSubmit(payload: IAssignmentSubmitPayload): void {
    this.enrollmentUc.submitAssignment(payload);
  }

  goHome(): void { this.router.navigate(['/learn/home']); }
}
