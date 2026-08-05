import { inject, Injectable, computed } from '@angular/core';
import { EnrollmentUseCase } from './enrollment.usecase';
import { CourseUseCase } from './course.usecase';
import { LearningPathUseCase } from './learning-path.usecase';
import { IEnrolledCourseEntry, IEnrolledPathEntry } from '../domain/model/enrollment.model';
import { ICourse } from '../domain/model/course.model';
import { ICatalogItem } from '../domain/model/catalog.model';

@Injectable({ providedIn: 'root' })
export class StudentHomeUseCase {
  private readonly enrollmentUc = inject(EnrollmentUseCase);
  private readonly courseUc     = inject(CourseUseCase);
  private readonly pathUc       = inject(LearningPathUseCase);

  readonly isLoading = computed(() => this.enrollmentUc.isLoading() || this.courseUc.isLoading());

  readonly enrolledCourses = computed((): IEnrolledCourseEntry[] => {
    const enrollments = this.enrollmentUc.enrollments();
    const courses     = this.courseUc.courses();
    return enrollments
      .map(e => ({ enrollment: e, course: courses.find(c => c.id === e.courseId)! }))
      .filter(x => !!x.course);
  });

  readonly inProgress = computed((): IEnrolledCourseEntry[] =>
    this.enrolledCourses()
      .filter(x => x.enrollment.status === 'active')
      .sort((a, b) =>
        b.enrollment.progress.lastAccessedAt.getTime() -
        a.enrollment.progress.lastAccessedAt.getTime()
      )
  );

  readonly completed = computed((): IEnrolledCourseEntry[] =>
    this.enrolledCourses().filter(x => x.enrollment.status === 'completed')
  );

  readonly enrolledPathEntries = computed((): IEnrolledPathEntry[] => {
    const pathEnrollments = this.enrollmentUc.pathEnrollments();
    const paths           = this.pathUc.learningPaths();
    return pathEnrollments
      .map(e => ({ enrollment: e, path: paths.find(p => p.id === e.learningPathId)! }))
      .filter(x => !!x.path);
  });

  readonly popularCourses = computed((): ICatalogItem[] => {
    const enrolledIds = new Set(this.enrollmentUc.enrollments().map(e => e.courseId));
    return this.courseUc.courses()
      .filter(c => c.status === 'published' && !enrolledIds.has(c.id))
      .sort((a, b) => b.enrolledCount - a.enrolledCount)
      .slice(0, 5)
      .map((c): ICatalogItem => ({
        kind: 'course',
        id: c.id,
        title: c.title,
        description: c.description,
        thumbnailUrl: c.thumbnailUrl,
        tags: c.tags,
        duration: c.totalDuration,
        meta: c.totalLessons ? `${c.totalLessons} lecciones` : '',
        difficulty: c.difficulty,
      }));
  });

  load(): void {
    if (this.enrollmentUc.enrollments().length === 0)     this.enrollmentUc.loadEnrollments();
    if (this.enrollmentUc.pathEnrollments().length === 0) this.enrollmentUc.loadPathEnrollments();
    if (this.courseUc.courses().length === 0)             this.courseUc.load();
    if (this.pathUc.learningPaths().length === 0)         this.pathUc.load();
  }
}
