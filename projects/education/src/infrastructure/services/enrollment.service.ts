import type { IRubricScore } from '../../domain/model/gradebook.model';
import { enrollmentErrorText } from './enrollment-rules.service';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, of, forkJoin, map, switchMap, throwError, catchError, shareReplay } from 'rxjs';
import { environment, FileUploadService } from 'shared';
import { AuthSessionService, EUserRole, IUser, UserService } from 'auth';
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

export interface IStudentProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
}

// ── API contract (ms-education) ───────────────────────────────────────────────

interface IEnrollmentApi {
  id: number;
  studentId: number;      // ms-auth user id
  courseId: number;
  status: string;
  enrolledAt: string;
  progress: number | null;
  completedAt: string | null;
  progressData: string | null;
}

/** Detailed progress kept in the enrollment's `progressData` JSON. */
interface IProgressData {
  progress?: Partial<ICourseProgress>;
  groupId?: string;
}

/** Quiz attempt as returned by ms-education (graded on the server). */
interface IAttemptApi {
  id: number;
  courseId: number;
  blockId: number;
  lessonId: number | null;
  attemptNumber: number;
  answers: IQuizAttempt['answers'];
  score: number;
  passed: boolean;
  feedback: IQuizAttempt['feedback'];
  completedAt: string;
}

interface ISubmissionApi {
  id: number;
  studentId: number;
  courseId: number;
  blockId: number;
  lessonId: number | null;
  textContent: string | null;
  fileUrls: string[] | null;
  submittedAt: string;
  grade: number | null;
  feedback: string | null;
  status: string;
  rubricScores?: IRubricScore[] | null;
}

function mapAttempt(a: IAttemptApi): IQuizAttempt {
  return {
    id: String(a.id),
    blockId: String(a.blockId),
    lessonId: a.lessonId != null ? String(a.lessonId) : '',
    courseId: String(a.courseId),
    attemptNumber: a.attemptNumber,
    answers: a.answers ?? [],
    score: a.score,
    passed: a.passed,
    feedback: a.feedback ?? [],
    completedAt: new Date(a.completedAt)
  };
}

function mapSubmission(s: ISubmissionApi): IAssignmentSubmission {
  return {
    id: String(s.id),
    blockId: String(s.blockId),
    lessonId: s.lessonId != null ? String(s.lessonId) : '',
    courseId: String(s.courseId),
    textContent: s.textContent ?? undefined,
    fileUrls: s.fileUrls ?? undefined,
    submittedAt: new Date(s.submittedAt),
    grade: s.grade ?? undefined,
    feedback: s.feedback ?? undefined,
    status: s.status === 'graded' ? 'graded' : s.status === 'returned' ? 'returned' : 'pending',
    rubricScores: s.rubricScores ?? undefined
  };
}

interface ICachedEnrollment {
  enrollment: IEnrollment;
  data: IProgressData;
}

const PATH_ENROLLMENTS_KEY = 'gems_path_enrollments';

interface IPathEnrollmentApi {
  id: number;
  learningPathId: number;
  studentId: number;
  status: 'active' | 'completed';
  enrolledAt: string;
  completedAt: string | null;
  /** Progress, only in GET /learning-paths/enrollments/me. */
  completedCourseIds?: number[];
  currentCourseId?: number | null;
  overallPercentage?: number;
}

function toPathEnrollment(e: IPathEnrollmentApi): ILearningPathEnrollment {
  return {
    id: String(e.id),
    userId: String(e.studentId),
    learningPathId: String(e.learningPathId),
    status: e.status,
    enrolledAt: new Date(e.enrolledAt),
    completedAt: e.completedAt ? new Date(e.completedAt) : undefined,
    completedCourseIds: (e.completedCourseIds ?? []).map(String),
    currentCourseId: e.currentCourseId == null ? undefined : String(e.currentCourseId),
    overallPercentage: e.overallPercentage ?? 0
  };
}

function parseData(raw: string | null): IProgressData {
  if (!raw) return {};
  try {
    const d = JSON.parse(raw) as IProgressData;
    return { progress: d.progress, groupId: d.groupId };
  } catch {
    return {};
  }
}

function mapEnrollment(r: IEnrollmentApi): ICachedEnrollment {
  const data = parseData(r.progressData);
  const p = data.progress ?? {};
  const courseId = String(r.courseId);
  const enrollment: IEnrollment = {
    id: String(r.id),
    userId: String(r.studentId),
    courseId,
    groupId: data.groupId,
    status: r.status === 'completed' ? 'completed' : r.status === 'paused' ? 'paused' : 'active',
    enrolledAt: new Date(r.enrolledAt),
    completedAt: r.completedAt ? new Date(r.completedAt) : undefined,
    progress: {
      courseId,
      overallPercentage: r.progress ?? 0,
      completedLessons: p.completedLessons ?? 0,
      totalLessons: p.totalLessons ?? 0,
      completedBlockIds: p.completedBlockIds ?? [],
      moduleProgress: p.moduleProgress ?? [],
      currentLessonId: p.currentLessonId,
      currentBlockId: p.currentBlockId,
      lastAccessedAt: p.lastAccessedAt ? new Date(p.lastAccessedAt) : new Date(r.enrolledAt)
    }
  };
  return { enrollment, data };
}

/** Readable message for rejected quiz attempts / submissions (the API sends a `code`). */
function activityError(err: unknown): string {
  const code = err instanceof HttpErrorResponse ? err.error?.code : undefined;
  switch (code) {
    case 'NOT_ENROLLED': return 'No estás matriculado en este curso';
    case 'ATTEMPT_LIMIT_REACHED': return 'Ya usaste todos los intentos de este quiz';
    case 'SESSION_CLOSED': return 'Este intento ya fue enviado';
    case 'SESSION_REQUIRED': case 'SESSION_NOT_FOUND': return 'El intento ya no es válido. Vuelve a iniciar la evaluación.';
    case 'BLOCK_NOT_FOUND': return 'Este contenido ya no existe. Recarga el curso.';
    default: return 'No se pudo enviar. Intenta de nuevo.';
  }
}

function toProfile(u: IUser): IStudentProfile {
  return { id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, avatarUrl: u.avatarUrl };
}

function unknownProfile(userId: string): IStudentProfile {
  return { id: userId, firstName: 'Usuario', lastName: `#${userId}`, email: '' };
}

@Injectable({ providedIn: 'root' })
export class EnrollmentService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(AuthSessionService);
  private readonly users = inject(UserService);
  private readonly courseService = inject(CourseService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly files = inject(FileUploadService);
  private readonly baseUrl = environment.apiUrls.education.enrollments;
  private readonly coursesUrl = environment.apiUrls.education.courses;

  /** Last known state of every enrollment this service has read or written, by id. */
  private readonly cache = new Map<string, ICachedEnrollment>();

  private readonly _gradedSubmission$ = new Subject<IAssignmentSubmission>();
  readonly gradedSubmission$ = this._gradedSubmission$.asObservable();

  // ── Student ────────────────────────────────────────────────────────────────

  getMyEnrollments(): Observable<IEnrollment[]> {
    return this.loadMine().pipe(map(list => list.map(c => c.enrollment)));
  }

  getMyQuizAttempts(): Observable<IQuizAttempt[]> {
    return this.myActivity().pipe(map(a => a.quizAttempts));
  }

  getMySubmissions(): Observable<IAssignmentSubmission[]> {
    return this.myActivity().pipe(map(a => a.submissions));
  }

  enrollInCourse(courseId: string): Observable<IEnrollment> {
    const userId = this.session.user()?.id;
    if (!userId) return throwError(() => new Error('Inicia sesión para matricularte'));
    return this.post(userId, courseId);
  }

  updateProgress(enrollmentId: string, progress: Partial<ICourseProgress>): Observable<IEnrollment> {
    return this.writeData(enrollmentId, data => ({
      ...data,
      progress: { ...data.progress, ...progress, lastAccessedAt: new Date() }
    }), progress.overallPercentage);
  }

  getQuizAttempts(blockId: string): Observable<IQuizAttempt[]> {
    return this.getMyQuizAttempts().pipe(map(list => list.filter(a => a.blockId === blockId)));
  }

  /** The API grades the answers; correct answers never reach the student. */
  submitQuiz(req: ISubmitQuizRequest): Observable<IQuizAttempt> {
    return this.http.post<IAttemptApi>(
      `${this.coursesUrl}/${req.courseId}/blocks/${req.blockId}/attempts`,
      req.sessionId ? { answers: req.answers, sessionId: Number(req.sessionId) } : { answers: req.answers }
    ).pipe(
      map(mapAttempt),
      catchError(err => throwError(() => new Error(activityError(err))))
    );
  }

  getSubmissions(blockId: string): Observable<IAssignmentSubmission[]> {
    return this.getMySubmissions().pipe(map(list => list.filter(s => s.blockId === blockId)));
  }

  /** Uploads the attached file (if any) as a private file, then sends the delivery. */
  submitAssignment(req: ISubmitAssignmentRequest): Observable<IAssignmentSubmission> {
    const upload = req.attachedFile
      ? this.files.upload(req.attachedFile, 'private').pipe(
          map(f => [...(req.fileUrls ?? []), f.url]),
          catchError(err => throwError(() => new Error(
            err?.status === 413 ? 'El archivo supera el tamaño permitido (10 MB).' : 'No se pudo subir el archivo adjunto.'
          )))
        )
      : of(req.fileUrls ?? []);
    return upload.pipe(
      switchMap(fileUrls => this.http.put<ISubmissionApi>(
        `${this.coursesUrl}/${req.courseId}/blocks/${req.blockId}/submission`,
        { textContent: req.textContent, fileUrls }
      ).pipe(catchError(err => throwError(() => new Error(activityError(err)))))),
      // The API notifies the institution's staff of the new delivery.
      map(saved => mapSubmission(saved))
    );
  }

  // ── Instructor / Admin ─────────────────────────────────────────────────────

  getEnrollmentsByCourse(courseId: string): Observable<(IEnrollment & { student: IStudentProfile })[]> {
    return forkJoin({
      list: this.http.get<IEnrollmentApi[]>(`${this.baseUrl}/course/${courseId}`),
      people: this.peopleById()
    }).pipe(
      map(({ list, people }) => list.map(r => {
        const entry = this.remember(mapEnrollment(r));
        return { ...entry.enrollment, student: people.get(entry.enrollment.userId) ?? unknownProfile(entry.enrollment.userId) };
      }))
    );
  }

  getAllCourseEnrollments(): Observable<(IEnrollment & { student: IStudentProfile })[]> {
    const institutionId = this.session.institutionId();
    if (institutionId) {
      return forkJoin({
        list: this.http.get<IEnrollmentApi[]>(`${this.baseUrl}/institution/${encodeURIComponent(institutionId)}`),
        people: this.peopleById()
      }).pipe(
        map(({ list, people }) => list.map(r => {
          const entry = this.remember(mapEnrollment(r));
          return { ...entry.enrollment, student: people.get(entry.enrollment.userId) ?? unknownProfile(entry.enrollment.userId) };
        }))
      );
    }
    // The super admin has no institution: walk every course.
    return this.courseService.getCourses().pipe(
      switchMap(res => res.courses.length
        ? forkJoin(res.courses.map(c => this.getEnrollmentsByCourse(c.id)))
        : of([])),
      map(lists => lists.flat())
    );
  }

  getAllSubmissions(): Observable<(IAssignmentSubmission & { student: IStudentProfile })[]> {
    const institutionId = this.session.institutionId();
    if (institutionId) {
      return forkJoin({
        list: this.http.get<ISubmissionApi[]>(`${environment.apiUrls.education.submissions}/institution/${encodeURIComponent(institutionId)}`),
        people: this.peopleById()
      }).pipe(
        map(({ list, people }) => list.map(s => ({
          ...mapSubmission(s),
          student: people.get(String(s.studentId)) ?? unknownProfile(String(s.studentId))
        })))
      );
    }
    return forkJoin({ courses: this.courseService.getCourses(), people: this.peopleById() }).pipe(
      switchMap(({ courses, people }) => courses.courses.length
        ? forkJoin(courses.courses.map(c =>
            this.http.get<ISubmissionApi[]>(`${this.coursesUrl}/${c.id}/submissions`).pipe(
              map(list => list.map(s => ({
                ...mapSubmission(s),
                student: people.get(String(s.studentId)) ?? unknownProfile(String(s.studentId))
              })))
            )))
        : of([])),
      map(lists => lists.flat())
    );
  }

  /** With rubricScores the API computes the grade from the block rubric and ignores grade. */
  gradeSubmission(submissionId: string, grade: number, feedback: string,
                  rubricScores?: IRubricScore[]): Observable<IAssignmentSubmission> {
    const body = rubricScores?.length ? { rubricScores, feedback } : { grade, feedback };
    return this.http.put<ISubmissionApi>(`${environment.apiUrls.education.submissions}/${submissionId}/grade`, body)
      .pipe(map(s => {
        const graded = mapSubmission(s);
        this._gradedSubmission$.next(graded);
        return graded;
      }));
  }

  enrollStudent(userId: string, courseId: string): Observable<IEnrollment> {
    return this.post(userId, courseId);
  }

  bulkEnroll(entries: { email: string; courseId: string }[]): Observable<{ success: number; skipped: number; errors: string[] }> {
    return this.getStudents().pipe(
      switchMap(students => {
        const errors: string[] = [];
        const byCourse = new Map<string, string[]>();
        for (const entry of entries) {
          const student = students.find(s => s.email.toLowerCase() === entry.email.trim().toLowerCase());
          if (!student) { errors.push(`No se encontró usuario: ${entry.email}`); continue; }
          byCourse.set(entry.courseId, [...(byCourse.get(entry.courseId) ?? []), student.id]);
        }
        if (!byCourse.size) return of({ success: 0, skipped: 0, errors });
        return forkJoin([...byCourse].map(([courseId, ids]) => this.enrollMany(ids, courseId))).pipe(
          map(results => ({
            success: results.reduce((s, r) => s + r.success, 0),
            skipped: results.reduce((s, r) => s + r.skipped, 0),
            errors
          }))
        );
      })
    );
  }

  enrollStudents(
    userIds: string[], targetId: string, type: 'course' | 'path', groupId?: string,
  ): Observable<{ success: number; skipped: number }> {
    if (type === 'course') return this.enrollMany(userIds, targetId, groupId);
    // A path enrollment is an enrollment in each of its courses.
    return this.http.get<{ courses: { id: number }[] | null }>(
      `${environment.apiUrls.education.learningPaths}/${targetId}`
    ).pipe(
      switchMap(path => {
        const courseIds = (path.courses ?? []).map(c => String(c.id));
        if (!courseIds.length) return of({ success: 0, skipped: 0 });
        return forkJoin(courseIds.map(id => this.enrollMany(userIds, id, groupId))).pipe(
          map(results => ({
            success: Math.max(...results.map(r => r.success)),
            skipped: Math.max(...results.map(r => r.skipped))
          })),
          switchMap(result => this.recordPathEnrollments(targetId, userIds).pipe(map(() => result)))
        );
      })
    );
  }

  /**
   * Looks up the given people among the institution's existing users. Creating accounts
   * from a spreadsheet is done from "Gestión de usuarios"; rows without an account are skipped.
   */
  addStudents(rows: { firstName: string; lastName: string; email: string }[]): IStudentProfile[] {
    const known = this.knownStudents;
    return rows
      .map(r => known.find(s => s.email.toLowerCase() === r.email.trim().toLowerCase()))
      .filter((s): s is IStudentProfile => !!s);
  }

  enrollInPath(pathId: string): Observable<ILearningPathEnrollment> {
    if (!this.session.user()?.id) return throwError(() => new Error('Inicia sesión para matricularte'));
    return this.http.post<IPathEnrollmentApi[]>(`${environment.apiUrls.education.learningPaths}/${pathId}/enrollments`, null).pipe(
      map(list => toPathEnrollment(list[0])),
      catchError(err => throwError(() => new Error(
        err instanceof HttpErrorResponse && err.status === 403
          ? 'Esta ruta no está disponible para matrícula'
          : 'No se pudo completar la matrícula en la ruta'
      )))
    );
  }

  getMyPathEnrollments(): Observable<ILearningPathEnrollment[]> {
    return this.migrateLegacyPathEnrollments().pipe(
      switchMap(() => this.http.get<IPathEnrollmentApi[]>(`${environment.apiUrls.education.learningPaths}/enrollments/me`)),
      map(list => list.map(toPathEnrollment))
    );
  }

  /** Records the path enrollment of these users (their course enrollments are made separately). */
  private recordPathEnrollments(pathId: string, userIds: string[]): Observable<unknown> {
    const studentIds = userIds.map(Number).filter(Number.isFinite);
    if (!studentIds.length) return of(null);
    return this.http.post(`${environment.apiUrls.education.learningPaths}/${pathId}/enrollments`, { studentIds })
      .pipe(catchError(() => of(null)));
  }

  getStudents(): Observable<IStudentProfile[]> {
    const institutionId = this.session.institutionId();
    const source = institutionId ? this.users.getInstitutionUsers(institutionId) : this.users.getAllUsers();
    return source.pipe(
      map(list => {
        const students = list.filter(u => u.role === EUserRole.STUDENT && u.isActive).map(toProfile);
        this.knownStudents = students;
        return students;
      })
    );
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  /** The caller's quiz attempts and assignment submissions. */
  private myActivity(): Observable<{ quizAttempts: IQuizAttempt[]; submissions: IAssignmentSubmission[] }> {
    if (!this.session.user()) return of({ quizAttempts: [], submissions: [] });
    return this.http.get<{ quizAttempts: IAttemptApi[]; submissions: ISubmissionApi[] }>(environment.apiUrls.education.activity)
      .pipe(map(r => ({ quizAttempts: r.quizAttempts.map(mapAttempt), submissions: r.submissions.map(mapSubmission) })));
  }

  private knownStudents: IStudentProfile[] = [];
  private mine$: Observable<ICachedEnrollment[]> | null = null;
  private mineFor: string | null = null;

  /** The current user's enrollments, fetched once per user and refreshed after writes. */
  private loadMine(): Observable<ICachedEnrollment[]> {
    const userId = this.session.user()?.id ?? null;
    if (!userId) return of([]);
    if (!this.mine$ || this.mineFor !== userId) {
      this.mineFor = userId;
      this.mine$ = this.http.get<IEnrollmentApi[]>(`${this.baseUrl}/student/${userId}`).pipe(
        map(list => list.map(r => this.remember(mapEnrollment(r)))),
        catchError(err => { this.mine$ = null; return throwError(() => err); }),
        shareReplay(1)
      );
    }
    return this.mine$.pipe(
      // Serve the freshest copy of each enrollment (writes update the cache).
      map(list => list.map(c => this.cache.get(c.enrollment.id) ?? c))
    );
  }

  private post(userId: string, courseId: string): Observable<IEnrollment> {
    return this.http.post<IEnrollmentApi>(this.baseUrl, { studentId: Number(userId), courseId: Number(courseId) }).pipe(
      map(r => {
        const entry = this.remember(mapEnrollment(r));
        if (userId === this.session.user()?.id) this.mine$ = null;
        return entry.enrollment;
      }),
      // Rejected by the enrollment rules of the course: say why.
      catchError(err => throwError(() => {
        const reason = enrollmentErrorText(err);
        return reason ? Object.assign(new Error(reason), { status: 409 }) : err;
      }))
    );
  }

  private enrollMany(userIds: string[], courseId: string, groupId?: string): Observable<{ success: number; skipped: number }> {
    if (!userIds.length) return of({ success: 0, skipped: 0 });
    return this.getEnrollmentsByCourse(courseId).pipe(
      switchMap(current => {
        const already = new Set(current.map(e => e.userId));
        const toEnroll = userIds.filter(id => !already.has(id));
        const skipped = userIds.length - toEnroll.length;
        if (!toEnroll.length) return of({ success: 0, skipped });
        return this.http.post<IEnrollmentApi[]>(`${this.baseUrl}/bulk`, {
          studentIds: toEnroll.map(Number),
          courseId: Number(courseId)
        }).pipe(
          switchMap(created => {
            const entries = created.map(r => this.remember(mapEnrollment(r)));
            if (!groupId || !entries.length) return of(entries);
            return forkJoin(entries.map(e => this.writeData(e.enrollment.id, d => ({ ...d, groupId }))));
          }),
          map(() => ({ success: toEnroll.length, skipped }))
        );
      })
    );
  }

  private readonly writeQueue = new Map<string, Observable<IEnrollment>>();

  /**
   * Applies `change` to the enrollment's progress data and saves it. Writes to the same
   * enrollment run one after another, each starting from the previous result, so two
   * quick updates (e.g. "block completed" and "current lesson") never overwrite each other.
   * A write keeps running even if its caller unsubscribes.
   */
  private writeData(enrollmentId: string, change: (data: IProgressData) => IProgressData, percentage?: number): Observable<IEnrollment> {
    const previous: Observable<unknown> = this.writeQueue.get(enrollmentId) ?? of(null);
    const write$: Observable<IEnrollment> = previous.pipe(
      catchError(() => of(null)),
      switchMap(() => this.cache.has(enrollmentId)
        ? of(this.cache.get(enrollmentId)!)
        : this.http.get<IEnrollmentApi>(`${this.baseUrl}/${enrollmentId}`).pipe(map(r => this.remember(mapEnrollment(r))))),
      switchMap(current => {
        const data = change(current.data);
        const progress = Math.max(0, Math.min(100, Math.round(percentage ?? current.enrollment.progress.overallPercentage)));
        return this.http.put<IEnrollmentApi>(`${this.baseUrl}/${enrollmentId}/progress`, {
          progress,
          progressData: JSON.stringify(data)
        });
      }),
      map(r => this.remember(mapEnrollment(r)).enrollment),
      shareReplay(1)
    );
    this.writeQueue.set(enrollmentId, write$);
    write$.subscribe({ error: () => { /* reported to the caller */ } });
    return write$;
  }

  private remember(entry: ICachedEnrollment): ICachedEnrollment {
    this.cache.set(entry.enrollment.id, entry);
    return entry;
  }

  private people$: Observable<Map<string, IStudentProfile>> | null = null;
  private peopleFor: string | null = null;

  private peopleById(): Observable<Map<string, IStudentProfile>> {
    const key = `${this.session.user()?.id}:${this.session.institutionId()}`;
    if (!this.people$ || this.peopleFor !== key) {
      this.peopleFor = key;
      const institutionId = this.session.institutionId();
      const source = institutionId ? this.users.getInstitutionUsers(institutionId) : this.users.getAllUsers();
      this.people$ = source.pipe(
        map(list => new Map(list.map(u => [u.id, toProfile(u)] as const))),
        catchError(() => of(new Map<string, IStudentProfile>())),
        shareReplay(1)
      );
    }
    return this.people$;
  }

  /** Path enrollments this browser kept before the API existed: uploaded once, then removed. */
  private migrateLegacyPathEnrollments(): Observable<unknown> {
    const userId = this.session.user()?.id;
    if (!this.isBrowser || !userId) return of(null);
    let legacy: ILearningPathEnrollment[] = [];
    try {
      const raw = localStorage.getItem(PATH_ENROLLMENTS_KEY);
      legacy = raw ? (JSON.parse(raw) as ILearningPathEnrollment[]).filter(e => e.userId === userId) : [];
      if (raw) {
        const others = (JSON.parse(raw) as ILearningPathEnrollment[]).filter(e => e.userId !== userId);
        if (others.length) localStorage.setItem(PATH_ENROLLMENTS_KEY, JSON.stringify(others));
        else localStorage.removeItem(PATH_ENROLLMENTS_KEY);
      }
    } catch {
      return of(null);
    }
    if (!legacy.length) return of(null);
    return forkJoin(legacy.map(e =>
      this.http.post(`${environment.apiUrls.education.learningPaths}/${e.learningPathId}/enrollments`, null)
        .pipe(catchError(() => of(null)))
    ));
  }
}
