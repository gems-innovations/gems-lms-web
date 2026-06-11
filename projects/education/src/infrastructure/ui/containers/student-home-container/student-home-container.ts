import { Component, inject, OnInit, computed, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { EnrollmentUseCase } from '../../../../application/enrollment.usecase';
import { CourseUseCase } from '../../../../application/course.usecase';
import { LearningPathUseCase } from '../../../../application/learning-path.usecase';
import { StudentHomeView } from '../../views/student-home-view/student-home-view';
import type { IEnrolledCourseEntry, IEnrolledPathEntry } from '../../views/student-home-view/student-home-view';

@Component({
  selector: 'edu-student-home-container',
  standalone: true,
  imports: [StudentHomeView],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './student-home-container.html'
})
export class StudentHomeContainer implements OnInit {
  private readonly router = inject(Router);
  private readonly enrollmentUc = inject(EnrollmentUseCase);
  private readonly courseUc = inject(CourseUseCase);
  private readonly pathUc = inject(LearningPathUseCase);

  // ── Derived data ──────────────────────────────────────────────────────────────
  readonly enrolledCourses = computed(() => {
    const enrollments = this.enrollmentUc.enrollments();
    const courses = this.courseUc.courses();
    return enrollments
      .map(e => ({ enrollment: e, course: courses.find(c => c.id === e.courseId)! }))
      .filter(x => !!x.course);
  });

  readonly inProgress = computed(() =>
    this.enrolledCourses()
      .filter(x => x.enrollment.status === 'active')
      .sort((a, b) =>
        b.enrollment.progress.lastAccessedAt.getTime() -
        a.enrollment.progress.lastAccessedAt.getTime()
      )
  );

  readonly completed = computed(() =>
    this.enrolledCourses().filter(x => x.enrollment.status === 'completed')
  );

  readonly enrolledPathEntries = computed((): IEnrolledPathEntry[] => {
    const pathEnrollments = this.enrollmentUc.pathEnrollments();
    const paths = this.pathUc.learningPaths();
    return pathEnrollments
      .map(e => ({ enrollment: e, path: paths.find(p => p.id === e.learningPathId)! }))
      .filter(x => !!x.path);
  });

  readonly isLoading = computed(() => this.enrollmentUc.isLoading() || this.courseUc.isLoading());

  // ── Lifecycle ─────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    if (this.enrollmentUc.enrollments().length === 0) this.enrollmentUc.loadEnrollments();
    if (this.enrollmentUc.pathEnrollments().length === 0) this.enrollmentUc.loadPathEnrollments();
    if (this.courseUc.courses().length === 0) this.courseUc.load();
    if (this.pathUc.learningPaths().length === 0) this.pathUc.load();
  }

  // ── Navigation ────────────────────────────────────────────────────────────────
  continueCourse(entry: IEnrolledCourseEntry): void {
    const { courseId, currentLessonId, currentBlockId } = entry.enrollment.progress;
    const params: Record<string, string> = {};
    if (currentLessonId) params['lesson'] = currentLessonId;
    if (currentBlockId) params['block'] = currentBlockId;
    this.router.navigate(['/learn/courses', courseId], { queryParams: params });
  }

  openPath(pathId: string): void {
    this.router.navigate(['/learn/paths', pathId]);
  }
}
