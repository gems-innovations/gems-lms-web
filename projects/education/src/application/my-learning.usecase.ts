import { inject, Injectable, computed, signal } from '@angular/core';
import { EnrollmentUseCase } from './enrollment.usecase';
import { CourseUseCase } from './course.usecase';
import { LearningPathUseCase } from './learning-path.usecase';
import { IEnrolledCourseEntry, IEnrolledPathEntry } from '../domain/model/enrollment.model';
import { ICourseCertificate } from '../domain/model/player.model';
import { EContentType } from '../domain/model/course.model';
import { ICertification } from '../domain/model/certificate.model';
import { CertificateService } from '../infrastructure/services/certificate.service';
export type { ICertification } from '../domain/model/certificate.model';

export interface IPendingTask {
  id: string;
  title: string;
  courseTitle: string;
  /** Not set until content blocks carry due dates. */
  dueDate?: Date;
  type: 'assignment' | 'quiz' | 'live-session';
}

@Injectable({ providedIn: 'root' })
export class MyLearningUseCase {
  private readonly enrollmentUc = inject(EnrollmentUseCase);
  private readonly courseUc     = inject(CourseUseCase);
  private readonly pathUc       = inject(LearningPathUseCase);
  private readonly certificateService = inject(CertificateService);
  private readonly _certifications = signal<ICertification[]>([]);

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

  readonly enrolledPaths = computed((): IEnrolledPathEntry[] => {
    const pathEnrollments = this.enrollmentUc.pathEnrollments();
    const paths           = this.pathUc.learningPaths();
    return pathEnrollments
      .map(e => ({ enrollment: e, path: paths.find(p => p.id === e.learningPathId)! }))
      .filter(x => !!x.path);
  });

  readonly certifications = this._certifications.asReadonly();

  /** Construye el certificado (mismo formato que se ve al completar el curso) para una certificación dada. */
  buildCertificate(cert: ICertification): ICourseCertificate | null {
    return {
      courseId:        cert.resourceId,
      courseTitle:     cert.resourceTitle,
      studentName:     cert.studentName,
      completedAt:     cert.completedAt,
      certificateId:   cert.id,
      instructorName:  cert.instructorName,
      institutionName: 'GEMS LMS',
    };
  }

  /**
   * Quizzes and assignments of the courses in progress that the student has not completed
   * (assignments already submitted are waiting for the instructor, so they are left out).
   * Content blocks have no due date yet, so tasks are listed in course order.
   */
  readonly pendingTasks = computed((): IPendingTask[] => {
    const submitted = new Set(this.enrollmentUc.submissions().map(s => s.blockId));
    return this.inProgress().flatMap(({ enrollment, course }) => {
      const done = new Set(enrollment.progress.completedBlockIds ?? []);
      return course.modules.flatMap(m => m.lessons).flatMap(l => l.contentBlocks)
        .filter(b => (b.type === EContentType.QUIZ || b.type === EContentType.ASSIGNMENT)
          && !done.has(b.id) && !submitted.has(b.id))
        .map(b => ({
          id: `${course.id}-${b.id}`,
          title: b.title,
          courseTitle: course.title,
          type: b.type === EContentType.QUIZ ? 'quiz' as const : 'assignment' as const
        }));
    });
  });

  /** Pending tasks that have a due date, soonest first (for the delivery calendar). */
  readonly datedTasks = computed(() =>
    this.pendingTasks()
      .filter((t): t is IPendingTask & { dueDate: Date } => !!t.dueDate)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
  );

  load(): void {
    if (this.enrollmentUc.enrollments().length === 0)     this.enrollmentUc.loadEnrollments();
    if (this.enrollmentUc.pathEnrollments().length === 0) this.enrollmentUc.loadPathEnrollments();
    if (this.courseUc.courses().length === 0)             this.courseUc.load();
    if (this.pathUc.learningPaths().length === 0)         this.pathUc.load();
    this.certificateService.mine().subscribe({
      next: items => this._certifications.set(items),
      error: () => this._certifications.set([]),
    });
  }
}
