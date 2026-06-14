import { Injectable, inject } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { NotificationService } from './notification.service';
import { CourseService } from './course.service';
import {
  IEnrollment,
  ILearningPathEnrollment,
  IQuizAttempt,
  IAssignmentSubmission,
  ISubmitQuizRequest,
  ISubmitAssignmentRequest,
  ICourseProgress
} from '../../domain/model/enrollment.model';

const MOCK_USER_ID = 'u1';

// ── Mock students (para instructor/admin) ────────────────────────────────────
export interface IStudentProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
}

export const MOCK_STUDENTS: IStudentProfile[] = [
  { id: 'u1',  firstName: 'Ana',     lastName: 'García',    email: 'ana.garcia@company.com' },
  { id: 'u2',  firstName: 'Carlos',  lastName: 'López',     email: 'carlos.lopez@company.com' },
  { id: 'u3',  firstName: 'María',   lastName: 'Martínez',  email: 'maria.martinez@company.com' },
  { id: 'u4',  firstName: 'Juan',    lastName: 'Rodríguez', email: 'juan.rodriguez@company.com' },
  { id: 'u5',  firstName: 'Laura',   lastName: 'Sánchez',   email: 'laura.sanchez@company.com' },
  { id: 'u6',  firstName: 'Pedro',   lastName: 'Fernández', email: 'pedro.fernandez@company.com' },
  { id: 'u7',  firstName: 'Sofia',   lastName: 'Torres',    email: 'sofia.torres@company.com' },
  { id: 'u8',  firstName: 'Diego',   lastName: 'Ramírez',   email: 'diego.ramirez@company.com' },
  { id: 'u9',  firstName: 'Valentina',lastName: 'Cruz',     email: 'valentina.cruz@company.com' },
  { id: 'u10', firstName: 'Andrés',  lastName: 'Morales',   email: 'andres.morales@company.com' },
];

// ── Enrollments de todos los estudiantes (instructor/admin view) ──────────────
const ALL_ENROLLMENTS: IEnrollment[] = [
  { id: 'enr1',  userId: 'u1', courseId: 'c1', status: 'active',    enrolledAt: new Date('2025-01-15'), progress: { courseId:'c1', overallPercentage:35, completedLessons:3,  totalLessons:8, lastAccessedAt: new Date('2025-05-20'), moduleProgress:[] } },
  { id: 'enr2',  userId: 'u1', courseId: 'c2', status: 'active',    enrolledAt: new Date('2025-02-01'), progress: { courseId:'c2', overallPercentage:60, completedLessons:5,  totalLessons:9, lastAccessedAt: new Date('2025-05-22'), moduleProgress:[] } },
  { id: 'enr3',  userId: 'u2', courseId: 'c1', status: 'active',    enrolledAt: new Date('2025-02-10'), progress: { courseId:'c1', overallPercentage:80, completedLessons:6,  totalLessons:8, lastAccessedAt: new Date('2025-05-21'), moduleProgress:[] } },
  { id: 'enr4',  userId: 'u3', courseId: 'c1', status: 'completed', enrolledAt: new Date('2025-01-20'), progress: { courseId:'c1', overallPercentage:100,completedLessons:8,  totalLessons:8, lastAccessedAt: new Date('2025-04-30'), moduleProgress:[] } },
  { id: 'enr5',  userId: 'u4', courseId: 'c1', status: 'active',    enrolledAt: new Date('2025-03-01'), progress: { courseId:'c1', overallPercentage:20, completedLessons:2,  totalLessons:8, lastAccessedAt: new Date('2025-05-18'), moduleProgress:[] } },
  { id: 'enr6',  userId: 'u5', courseId: 'c2', status: 'active',    enrolledAt: new Date('2025-02-15'), progress: { courseId:'c2', overallPercentage:45, completedLessons:4,  totalLessons:9, lastAccessedAt: new Date('2025-05-23'), moduleProgress:[] } },
  { id: 'enr7',  userId: 'u6', courseId: 'c2', status: 'paused',    enrolledAt: new Date('2025-01-28'), progress: { courseId:'c2', overallPercentage:15, completedLessons:1,  totalLessons:9, lastAccessedAt: new Date('2025-04-10'), moduleProgress:[] } },
  { id: 'enr8',  userId: 'u7', courseId: 'c2', status: 'active',    enrolledAt: new Date('2025-03-05'), progress: { courseId:'c2', overallPercentage:70, completedLessons:6,  totalLessons:9, lastAccessedAt: new Date('2025-05-24'), moduleProgress:[] } },
  { id: 'enr9',  userId: 'u8', courseId: 'c1', status: 'active',    enrolledAt: new Date('2025-03-10'), progress: { courseId:'c1', overallPercentage:55, completedLessons:4,  totalLessons:8, lastAccessedAt: new Date('2025-05-20'), moduleProgress:[] } },
  { id: 'enr10', userId: 'u9', courseId: 'c2', status: 'completed', enrolledAt: new Date('2025-01-10'), progress: { courseId:'c2', overallPercentage:100,completedLessons:9,  totalLessons:9, lastAccessedAt: new Date('2025-05-01'), moduleProgress:[] } },
  { id: 'enr11', userId:'u10', courseId: 'c1', status: 'active',    enrolledAt: new Date('2025-04-01'), progress: { courseId:'c1', overallPercentage:10, completedLessons:1,  totalLessons:8, lastAccessedAt: new Date('2025-05-15'), moduleProgress:[] } },
  { id: 'enr12', userId: 'u2', courseId: 'c2', status: 'active',    enrolledAt: new Date('2025-03-20'), progress: { courseId:'c2', overallPercentage:30, completedLessons:3,  totalLessons:9, lastAccessedAt: new Date('2025-05-19'), moduleProgress:[] } },
];

// ── Submissions de tareas (todas) ─────────────────────────────────────────────
const ALL_SUBMISSIONS: IAssignmentSubmission[] = [
  // cb6 → Tarea: Análisis exploratorio (c1, módulo 1)
  { id: 'sub1', blockId: 'cb6',  lessonId: 'l1-1-2', courseId: 'c1', textContent: 'Análisis exploratorio completo en Jupyter con visualizaciones. Repo: https://github.com/ana/eda-python',    submittedAt: new Date('2025-05-18'), status: 'graded', grade: 92, feedback: 'Muy buen análisis. Las visualizaciones son claras y bien documentadas.' },
  { id: 'sub2', blockId: 'cb6',  lessonId: 'l1-1-2', courseId: 'c1', textContent: 'https://github.com/diego/python-eda — incluye limpieza de datos y 3 gráficas comparativas.',              submittedAt: new Date('2025-05-23'), status: 'pending' },
  { id: 'sub3', blockId: 'cb6',  lessonId: 'l1-1-2', courseId: 'c1', textContent: 'Notebook adjunto con EDA completo. Usé Pandas, Seaborn y Plotly. Repo: https://github.com/carlos/eda',   submittedAt: new Date('2025-05-25'), status: 'pending' },
  // cb10 → Tarea: CRUD API REST (c2, módulo 2)
  { id: 'sub4', blockId: 'cb10', lessonId: 'l2-2-1', courseId: 'c2', textContent: 'https://github.com/carlos/crud-api — API REST con Express, validación con Joi y tests con Jest.',         submittedAt: new Date('2025-05-20'), status: 'pending' },
  { id: 'sub5', blockId: 'cb10', lessonId: 'l2-2-1', courseId: 'c2', textContent: 'Repositorio con solución completa: https://github.com/sofia/express-crud. Incluye Swagger.',              submittedAt: new Date('2025-05-21'), status: 'graded', grade: 88, feedback: 'Excelente manejo de errores. Podrías agregar más tests de integración.' },
  { id: 'sub6', blockId: 'cb10', lessonId: 'l2-2-1', courseId: 'c2', textContent: 'Implementé todos los endpoints CRUD con validación de datos. Link: https://github.com/ana/api-rest',      submittedAt: new Date('2025-05-19'), status: 'graded', grade: 95, feedback: 'Implementación impecable. La documentación Swagger es un plus.' },
  // cb24 → Tarea: Integración con PostgreSQL (c2, módulo 3)
  { id: 'sub7', blockId: 'cb24', lessonId: 'l2-3-3', courseId: 'c2', textContent: 'https://github.com/carlos/pg-api — integración con Sequelize y migraciones automáticas.',               submittedAt: new Date('2025-05-22'), status: 'pending' },
  { id: 'sub8', blockId: 'cb24', lessonId: 'l2-3-3', courseId: 'c2', textContent: 'Implementé el ORM con TypeORM. Repositorio: https://github.com/maria/typeorm-api.',                       submittedAt: new Date('2025-05-24'), status: 'graded', grade: 80, feedback: 'Buen trabajo. Falta manejar las transacciones en operaciones críticas.' },
  // cb32 → Tarea: Proyecto final (c2, módulo 5)
  { id: 'sub9', blockId: 'cb32', lessonId: 'l2-5-3', courseId: 'c2', textContent: 'Proyecto final desplegado en Railway. URL: https://my-app.railway.app — CI/CD con GitHub Actions.',      submittedAt: new Date('2025-05-24'), status: 'returned', grade: 75, feedback: 'Falta documentación del pipeline CI/CD. Por favor agrega el diagrama de arquitectura.' },
  { id: 'sub10',blockId: 'cb32', lessonId: 'l2-5-3', courseId: 'c2', textContent: 'App desplegada en Vercel + Render. Repo: https://github.com/juan/fullstack-final.',                       submittedAt: new Date('2025-05-26'), status: 'pending' },
];

// Asociar userId a cada submission (simulando que pertenecen a distintos estudiantes)
const SUBMISSION_USER_MAP: Record<string, string> = {
  'sub1': 'u1',  'sub2': 'u8',  'sub3': 'u2',
  'sub4': 'u2',  'sub5': 'u7',  'sub6': 'u1',
  'sub7': 'u2',  'sub8': 'u3',
  'sub9': 'u9',  'sub10': 'u4',
};

const MOCK_ENROLLMENTS: IEnrollment[] = [
  {
    id: 'enr1',
    userId: MOCK_USER_ID,
    courseId: 'c1',
    status: 'active',
    enrolledAt: new Date('2025-01-15'),
    progress: {
      courseId: 'c1',
      overallPercentage: 35,
      completedLessons: 1,
      totalLessons: 24,
      lastAccessedAt: new Date('2025-05-20'),
      currentLessonId: 'l1-1-2',
      currentBlockId: 'cb3',
      moduleProgress: [
        { moduleId: 'm1-1', completedLessons: 1, totalLessons: 2, percentage: 50 },
        { moduleId: 'm1-2', completedLessons: 0, totalLessons: 1, percentage: 0 }
      ]
    }
  },
  {
    id: 'enr2',
    userId: MOCK_USER_ID,
    courseId: 'c2',
    status: 'active',
    enrolledAt: new Date('2025-02-01'),
    progress: {
      courseId: 'c2',
      overallPercentage: 60,
      completedLessons: 1,
      totalLessons: 38,
      lastAccessedAt: new Date('2025-05-22'),
      currentLessonId: 'l2-2-1',
      currentBlockId: 'cb9',
      moduleProgress: [
        { moduleId: 'm2-1', completedLessons: 1, totalLessons: 1, percentage: 100 },
        { moduleId: 'm2-2', completedLessons: 0, totalLessons: 1, percentage: 0 }
      ]
    }
  },
  {
    id: 'enr3',
    userId: MOCK_USER_ID,
    courseId: 'c7',
    status: 'active',
    enrolledAt: new Date('2025-03-10'),
    progress: {
      courseId: 'c7',
      overallPercentage: 20,
      completedLessons: 5,
      totalLessons: 26,
      lastAccessedAt: new Date('2025-05-18'),
      currentLessonId: 'l7-1-1',
      currentBlockId: 'cb20',
      moduleProgress: [
        { moduleId: 'm7-1', completedLessons: 5, totalLessons: 26, percentage: 20 }
      ]
    }
  },
  {
    id: 'enr4',
    userId: MOCK_USER_ID,
    courseId: 'c9',
    status: 'active',
    enrolledAt: new Date('2025-04-05'),
    progress: {
      courseId: 'c9',
      overallPercentage: 45,
      completedLessons: 10,
      totalLessons: 22,
      lastAccessedAt: new Date('2025-05-10'),
      currentLessonId: 'l9-1-1',
      currentBlockId: 'cb30',
      moduleProgress: [
        { moduleId: 'm9-1', completedLessons: 10, totalLessons: 22, percentage: 45 }
      ]
    }
  }
];

const MOCK_PATH_ENROLLMENTS: ILearningPathEnrollment[] = [
  {
    id: 'penr1',
    userId: MOCK_USER_ID,
    learningPathId: 'lp1',
    status: 'active',
    enrolledAt: new Date('2025-01-15'),
    completedCourseIds: [],
    currentCourseId: 'c3',
    overallPercentage: 20
  },
  {
    id: 'penr2',
    userId: MOCK_USER_ID,
    learningPathId: 'lp2',
    status: 'active',
    enrolledAt: new Date('2025-02-20'),
    completedCourseIds: ['c2'],
    currentCourseId: 'c2',
    overallPercentage: 55
  },
  {
    id: 'penr3',
    userId: MOCK_USER_ID,
    learningPathId: 'lp4',
    status: 'active',
    enrolledAt: new Date('2025-03-05'),
    completedCourseIds: [],
    currentCourseId: 'c9',
    overallPercentage: 10
  },
  {
    id: 'penr4',
    userId: MOCK_USER_ID,
    learningPathId: 'lp5',
    status: 'active',
    enrolledAt: new Date('2025-04-01'),
    completedCourseIds: [],
    currentCourseId: 'c8',
    overallPercentage: 35
  },
  {
    id: 'penr5',
    userId: MOCK_USER_ID,
    learningPathId: 'lp3',
    status: 'active',
    enrolledAt: new Date('2025-05-01'),
    completedCourseIds: [],
    currentCourseId: 'c4',
    overallPercentage: 5
  }
];

const MOCK_QUIZ_ATTEMPTS: IQuizAttempt[] = [
  {
    id: 'att1',
    blockId: 'cb4',
    lessonId: 'l1-1-2',
    courseId: 'c1',
    attemptNumber: 1,
    answers: [
      { questionId: 'q1', answer: ['a'] },
      { questionId: 'q2', answer: false },
      { questionId: 'q3', answer: ['a', 'b'] },
      { questionId: 'q4', answer: 'La clasificación predice categorías, la regresión valores continuos.' }
    ],
    score: 75,
    passed: true,
    completedAt: new Date('2025-05-18'),
    feedback: [
      { questionId: 'q1', correct: true },
      { questionId: 'q2', correct: true },
      { questionId: 'q3', correct: false, explanation: 'Solo K-Means y DBSCAN son no supervisados.' },
      { questionId: 'q4', correct: true }
    ]
  }
];

const MOCK_SUBMISSIONS: IAssignmentSubmission[] = [];

@Injectable({ providedIn: 'root' })
export class EnrollmentService {
  private readonly USE_MOCK = true;
  private readonly notifications = inject(NotificationService);
  private readonly courseService = inject(CourseService);

  getMyEnrollments(): Observable<IEnrollment[]> {
    if (this.USE_MOCK) {
      return of([...MOCK_ENROLLMENTS]).pipe(delay(300));
    }
    return of([]);
  }

  getMyPathEnrollments(): Observable<ILearningPathEnrollment[]> {
    if (this.USE_MOCK) {
      return of([...MOCK_PATH_ENROLLMENTS]).pipe(delay(300));
    }
    return of([]);
  }

  enrollInCourse(courseId: string): Observable<IEnrollment> {
    if (this.USE_MOCK) {
      const existing = MOCK_ENROLLMENTS.find(e => e.courseId === courseId);
      if (existing) return of(existing).pipe(delay(200));

      const enrollment: IEnrollment = {
        id: `enr${Date.now()}`,
        userId: MOCK_USER_ID,
        courseId,
        status: 'active',
        enrolledAt: new Date(),
        progress: {
          courseId,
          overallPercentage: 0,
          completedLessons: 0,
          totalLessons: 0,
          lastAccessedAt: new Date(),
          moduleProgress: []
        }
      };
      MOCK_ENROLLMENTS.push(enrollment);
      return of(enrollment).pipe(delay(400));
    }
    return of({} as IEnrollment);
  }

  updateProgress(enrollmentId: string, progress: Partial<ICourseProgress>): Observable<IEnrollment> {
    if (this.USE_MOCK) {
      const idx = MOCK_ENROLLMENTS.findIndex(e => e.id === enrollmentId);
      if (idx !== -1) {
        MOCK_ENROLLMENTS[idx] = {
          ...MOCK_ENROLLMENTS[idx],
          progress: { ...MOCK_ENROLLMENTS[idx].progress, ...progress, lastAccessedAt: new Date() }
        };
        return of(MOCK_ENROLLMENTS[idx]).pipe(delay(100));
      }
    }
    return of({} as IEnrollment);
  }

  getQuizAttempts(blockId: string): Observable<IQuizAttempt[]> {
    if (this.USE_MOCK) {
      return of(MOCK_QUIZ_ATTEMPTS.filter(a => a.blockId === blockId)).pipe(delay(200));
    }
    return of([]);
  }

  submitQuiz(req: ISubmitQuizRequest): Observable<IQuizAttempt> {
    if (this.USE_MOCK) {
      const prevAttempts = MOCK_QUIZ_ATTEMPTS.filter(a => a.blockId === req.blockId).length;
      // Simple scoring: 25 points per correct answer (mock)
      const score = Math.floor(Math.random() * 40) + 60; // 60-100 random for demo
      const attempt: IQuizAttempt = {
        id: `att${Date.now()}`,
        blockId: req.blockId,
        lessonId: req.lessonId,
        courseId: req.courseId,
        attemptNumber: prevAttempts + 1,
        answers: req.answers,
        score,
        passed: score >= 70,
        completedAt: new Date()
      };
      MOCK_QUIZ_ATTEMPTS.push(attempt);
      return of(attempt).pipe(delay(800));
    }
    return of({} as IQuizAttempt);
  }

  getSubmissions(blockId: string): Observable<IAssignmentSubmission[]> {
    if (this.USE_MOCK) {
      return of(MOCK_SUBMISSIONS.filter(s => s.blockId === blockId)).pipe(delay(200));
    }
    return of([]);
  }

  submitAssignment(req: ISubmitAssignmentRequest): Observable<IAssignmentSubmission> {
    if (this.USE_MOCK) {
      const submission: IAssignmentSubmission = {
        id: `sub${Date.now()}`,
        blockId: req.blockId,
        lessonId: req.lessonId,
        courseId: req.courseId,
        textContent: req.textContent,
        fileUrls: req.fileUrls,
        submittedAt: new Date(),
        status: 'pending'
      };
      MOCK_SUBMISSIONS.push(submission);

      // Notify the instructor about the new submission
      const student = MOCK_STUDENTS.find(s => s.id === MOCK_USER_ID);
      const studentName = student ? `${student.firstName} ${student.lastName}` : 'Un estudiante';
      this.courseService.getCourseById(req.courseId).subscribe(course => {
        let blockTitle = 'una tarea';
        for (const m of course?.modules ?? []) {
          for (const l of m.lessons ?? []) {
            const blk = l.contentBlocks?.find(b => b.id === req.blockId);
            if (blk) blockTitle = blk.title;
          }
        }
        this.notifications.notifySubmission(
          studentName, blockTitle, course?.title ?? req.courseId, req.courseId, submission.id
        );
      });

      return of(submission).pipe(delay(600));
    }
    return of({} as IAssignmentSubmission);
  }

  // ── Instructor / Admin methods ─────────────────────────────────────────────

  getEnrollmentsByCourse(courseId: string): Observable<(IEnrollment & { student: IStudentProfile })[]> {
    const result = ALL_ENROLLMENTS
      .filter(e => e.courseId === courseId)
      .map(e => ({ ...e, student: MOCK_STUDENTS.find(s => s.id === e.userId)! }))
      .filter(e => !!e.student);
    return of(result).pipe(delay(300));
  }

  getAllCourseEnrollments(): Observable<(IEnrollment & { student: IStudentProfile })[]> {
    const result = ALL_ENROLLMENTS
      .map(e => ({ ...e, student: MOCK_STUDENTS.find(s => s.id === e.userId)! }))
      .filter(e => !!e.student);
    return of(result).pipe(delay(300));
  }

  getAllSubmissions(): Observable<(IAssignmentSubmission & { student: IStudentProfile })[]> {
    const result = ALL_SUBMISSIONS.map(s => ({
      ...s,
      student: MOCK_STUDENTS.find(st => st.id === SUBMISSION_USER_MAP[s.id])!
    })).filter(s => !!s.student);
    return of(result).pipe(delay(300));
  }

  gradeSubmission(submissionId: string, grade: number, feedback: string): Observable<IAssignmentSubmission> {
    const idx = ALL_SUBMISSIONS.findIndex(s => s.id === submissionId);
    if (idx !== -1) {
      ALL_SUBMISSIONS[idx] = { ...ALL_SUBMISSIONS[idx], grade, feedback, status: 'graded' };
      return of(ALL_SUBMISSIONS[idx]).pipe(delay(400));
    }
    return of({} as IAssignmentSubmission);
  }

  enrollStudent(userId: string, courseId: string): Observable<IEnrollment> {
    const existing = ALL_ENROLLMENTS.find(e => e.userId === userId && e.courseId === courseId);
    if (existing) return of(existing).pipe(delay(200));
    const enrollment: IEnrollment = {
      id: `enr${Date.now()}`, userId, courseId, status: 'active',
      enrolledAt: new Date(),
      progress: { courseId, overallPercentage: 0, completedLessons: 0, totalLessons: 0, lastAccessedAt: new Date(), moduleProgress: [] }
    };
    ALL_ENROLLMENTS.push(enrollment);
    return of(enrollment).pipe(delay(400));
  }

  bulkEnroll(entries: { email: string; courseId: string }[]): Observable<{ success: number; skipped: number; errors: string[] }> {
    let success = 0; let skipped = 0; const errors: string[] = [];
    for (const entry of entries) {
      const student = MOCK_STUDENTS.find(s => s.email.toLowerCase() === entry.email.toLowerCase());
      if (!student) { errors.push(`No se encontró usuario: ${entry.email}`); continue; }
      const exists = ALL_ENROLLMENTS.find(e => e.userId === student.id && e.courseId === entry.courseId);
      if (exists) { skipped++; continue; }
      ALL_ENROLLMENTS.push({
        id: `enr${Date.now()}-${success}`, userId: student.id, courseId: entry.courseId, status: 'active',
        enrolledAt: new Date(),
        progress: { courseId: entry.courseId, overallPercentage: 0, completedLessons: 0, totalLessons: 0, lastAccessedAt: new Date(), moduleProgress: [] }
      });
      success++;
    }
    return of({ success, skipped, errors }).pipe(delay(600));
  }

  enrollStudents(userIds: string[], targetId: string, type: 'course' | 'path'): Observable<{ success: number; skipped: number }> {
    let success = 0; let skipped = 0;
    for (const userId of userIds) {
      if (type === 'course') {
        const exists = ALL_ENROLLMENTS.find(e => e.userId === userId && e.courseId === targetId);
        if (exists) { skipped++; continue; }
        ALL_ENROLLMENTS.push({
          id: `enr${Date.now()}-${success}`, userId, courseId: targetId, status: 'active',
          enrolledAt: new Date(),
          progress: { courseId: targetId, overallPercentage: 0, completedLessons: 0, totalLessons: 0, lastAccessedAt: new Date(), moduleProgress: [] }
        });
        success++;
      } else {
        success++;
      }
    }
    return of({ success, skipped }).pipe(delay(500));
  }

  enrollInPath(pathId: string): Observable<ILearningPathEnrollment> {
    const existing = MOCK_PATH_ENROLLMENTS.find(e => e.learningPathId === pathId);
    if (existing) return of(existing).pipe(delay(200));
    const enrollment: ILearningPathEnrollment = {
      id: `penr${Date.now()}`, userId: MOCK_USER_ID, learningPathId: pathId,
      status: 'active', enrolledAt: new Date(),
      completedCourseIds: [], overallPercentage: 0
    };
    MOCK_PATH_ENROLLMENTS.push(enrollment);
    return of(enrollment).pipe(delay(400));
  }

  getStudents(): Observable<IStudentProfile[]> {
    return of([...MOCK_STUDENTS]).pipe(delay(200));
  }
}
