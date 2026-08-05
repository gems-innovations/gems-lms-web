import { inject, Injectable, computed } from '@angular/core';
import { EnrollmentUseCase } from './enrollment.usecase';
import { CourseUseCase } from './course.usecase';
import { LearningPathUseCase } from './learning-path.usecase';
import { AuthSessionService } from 'auth';
import { IEnrolledCourseEntry, IEnrolledPathEntry } from '../domain/model/enrollment.model';
import { ICourseCertificate } from '../domain/model/player.model';
import { MOCK_STUDENTS, MOCK_USER_ID } from '../infrastructure/services/enrollment.service';

export interface ICertification {
  id: string;
  courseId: string;
  courseTitle: string;
  issuedAt: Date;
  expiresAt?: Date;
}

export interface IPendingTask {
  id: string;
  title: string;
  courseTitle: string;
  dueDate: Date;
  type: 'assignment' | 'quiz' | 'live-session';
}

const MOCK_PENDING_TASKS: IPendingTask[] = [
  { id: 'task1', title: 'Análisis exploratorio de datos',   courseTitle: 'Python para Ciencia de Datos', dueDate: new Date('2026-06-20'), type: 'assignment' },
  { id: 'task2', title: 'Quiz: Fundamentos de Node.js',     courseTitle: 'Node.js Backend Avanzado',     dueDate: new Date('2026-06-18'), type: 'quiz' },
  { id: 'task3', title: 'Sesión en vivo: Code Review',      courseTitle: 'React con Next.js',            dueDate: new Date('2026-06-22'), type: 'live-session' },
  { id: 'task4', title: 'Proyecto final: API REST',         courseTitle: 'Node.js Backend Avanzado',     dueDate: new Date('2026-07-01'), type: 'assignment' },
  { id: 'task5', title: 'Tarea: Diseño de componentes',     courseTitle: 'UX/UI con Figma',              dueDate: new Date('2026-06-25'), type: 'assignment' },
];

@Injectable({ providedIn: 'root' })
export class MyLearningUseCase {
  private readonly enrollmentUc = inject(EnrollmentUseCase);
  private readonly courseUc     = inject(CourseUseCase);
  private readonly pathUc       = inject(LearningPathUseCase);
  private readonly authSession  = inject(AuthSessionService);

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

  readonly certifications = computed((): ICertification[] =>
    this.completed().map(x => ({
      id: x.enrollment.id,
      courseId: x.course.id,
      courseTitle: x.course.title,
      issuedAt: x.enrollment.completedAt ?? x.enrollment.enrolledAt,
    }))
  );

  /** Construye el certificado (mismo formato que se ve al completar el curso) para una certificación dada. */
  buildCertificate(cert: ICertification): ICourseCertificate | null {
    const entry = this.completed().find(x => x.course.id === cert.courseId);
    if (!entry) return null;

    const user = this.authSession.user();
    let studentName = 'Estudiante';
    if (user) {
      studentName = `${user.firstName} ${user.lastName}`.trim();
    } else {
      const student = MOCK_STUDENTS.find(s => s.id === MOCK_USER_ID);
      if (student) studentName = `${student.firstName} ${student.lastName}`;
    }

    return {
      courseId:        entry.course.id,
      courseTitle:     entry.course.title,
      studentName,
      completedAt:     cert.issuedAt,
      certificateId:   `CERT-${entry.course.id.slice(0, 8).toUpperCase()}`,
      instructorName:  entry.course.instructorName,
      institutionName: 'GEMS LMS',
    };
  }

  readonly pendingTasks = computed((): IPendingTask[] =>
    MOCK_PENDING_TASKS.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
  );

  load(): void {
    if (this.enrollmentUc.enrollments().length === 0)     this.enrollmentUc.loadEnrollments();
    if (this.enrollmentUc.pathEnrollments().length === 0) this.enrollmentUc.loadPathEnrollments();
    if (this.courseUc.courses().length === 0)             this.courseUc.load();
    if (this.pathUc.learningPaths().length === 0)         this.pathUc.load();
  }
}
