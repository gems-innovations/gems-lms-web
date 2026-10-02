import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, of, forkJoin, map, switchMap, throwError, catchError, shareReplay } from 'rxjs';
import { environment } from 'shared';
import { AuthSessionService, EUserRole, IUser, UserService } from 'auth';
import { NotificationService } from './notification.service';
import { CourseService } from './course.service';
import { ICourse, IQuestion } from '../../domain/model/course.model';
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

/**
 * Detailed progress kept in the enrollment's `progressData` JSON. The API has no
 * dedicated resources for quiz attempts or assignment submissions yet, so they are
 * stored here too (the instructor grades by rewriting the student's enrollment).
 */
interface IProgressData {
  progress?: Partial<ICourseProgress>;
  quizAttempts?: IQuizAttempt[];
  submissions?: IAssignmentSubmission[];
  groupId?: string;
}

interface ICachedEnrollment {
  enrollment: IEnrollment;
  data: IProgressData;
}

const PATH_ENROLLMENTS_KEY = 'gems_path_enrollments';

function reviveDates<T extends object>(obj: T, keys: string[]): T {
  const out = { ...obj } as Record<string, unknown>;
  for (const k of keys) if (typeof out[k] === 'string') out[k] = new Date(out[k] as string);
  return out as T;
}

function parseData(raw: string | null): IProgressData {
  if (!raw) return {};
  try {
    const d = JSON.parse(raw) as IProgressData;
    return {
      ...d,
      quizAttempts: (d.quizAttempts ?? []).map(a => reviveDates(a, ['completedAt'])),
      submissions: (d.submissions ?? []).map(s => reviveDates(s, ['submittedAt']))
    };
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

function toProfile(u: IUser): IStudentProfile {
  return { id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, avatarUrl: u.avatarUrl };
}

function unknownProfile(userId: string): IStudentProfile {
  return { id: userId, firstName: 'Usuario', lastName: `#${userId}`, email: '' };
}

/** Grades a quiz block against its questions (open questions are not graded). */
function gradeQuiz(course: ICourse, req: ISubmitQuizRequest, attemptNumber: number): IQuizAttempt {
  const block = course.modules.flatMap(m => m.lessons).flatMap(l => l.contentBlocks).find(b => b.id === req.blockId);
  const questions: IQuestion[] = block?.questions ?? [];
  let score = 0;
  let maxScore = 0;
  const feedback: NonNullable<IQuizAttempt['feedback']> = [];

  for (const q of questions) {
    if (q.type === 'open') continue;
    const points = q.points || 1;
    maxScore += points;
    const answer = req.answers.find(a => a.questionId === q.id)?.answer;
    let correct = false;
    if (q.type === 'multiple-choice') {
      const expected = q.correctAnswers || [];
      const given = Array.isArray(answer) ? answer : (answer !== undefined && answer !== '' ? [String(answer)] : []);
      correct = expected.length > 0 && expected.length === given.length && expected.every(c => given.includes(c));
    } else if (q.type === 'true-false') {
      correct = answer === q.correctAnswer;
    }
    if (correct) score += points;
    feedback.push({ questionId: q.id, correct, explanation: q.explanation });
  }

  const finalScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  return {
    id: `att-${Date.now()}`,
    blockId: req.blockId,
    lessonId: req.lessonId,
    courseId: req.courseId,
    attemptNumber,
    answers: req.answers,
    score: finalScore,
    passed: finalScore >= (block?.passingScore || 70),
    feedback,
    completedAt: new Date()
  };
}

@Injectable({ providedIn: 'root' })
export class EnrollmentService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(AuthSessionService);
  private readonly users = inject(UserService);
  private readonly notifications = inject(NotificationService);
  private readonly courseService = inject(CourseService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly baseUrl = environment.apiUrls.education.enrollments;

  /** Last known state of every enrollment this service has read or written, by id. */
  private readonly cache = new Map<string, ICachedEnrollment>();

  private readonly _gradedSubmission$ = new Subject<IAssignmentSubmission>();
  readonly gradedSubmission$ = this._gradedSubmission$.asObservable();

  // ── Student ────────────────────────────────────────────────────────────────

  getMyEnrollments(): Observable<IEnrollment[]> {
    return this.loadMine().pipe(map(list => list.map(c => c.enrollment)));
  }

  getMyQuizAttempts(): Observable<IQuizAttempt[]> {
    return this.loadMine().pipe(map(list => list.flatMap(c => c.data.quizAttempts ?? [])));
  }

  getMySubmissions(): Observable<IAssignmentSubmission[]> {
    return this.loadMine().pipe(map(list => list.flatMap(c => c.data.submissions ?? [])));
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

  submitQuiz(req: ISubmitQuizRequest): Observable<IQuizAttempt> {
    return forkJoin({
      course: this.courseService.getCourseById(req.courseId),
      mine: this.loadMine()
    }).pipe(
      switchMap(({ course, mine }) => {
        const entry = mine.find(c => c.enrollment.courseId === req.courseId);
        if (!entry) return throwError(() => new Error('No estás matriculado en este curso'));
        const previous = (entry.data.quizAttempts ?? []).filter(a => a.blockId === req.blockId).length;
        const attempt = gradeQuiz(course, req, previous + 1);
        return this.writeData(entry.enrollment.id, data => ({
          ...data,
          quizAttempts: [...(data.quizAttempts ?? []), attempt]
        })).pipe(map(() => attempt));
      })
    );
  }

  getSubmissions(blockId: string): Observable<IAssignmentSubmission[]> {
    return this.getMySubmissions().pipe(map(list => list.filter(s => s.blockId === blockId)));
  }

  submitAssignment(req: ISubmitAssignmentRequest): Observable<IAssignmentSubmission> {
    return forkJoin({
      course: this.courseService.getCourseById(req.courseId),
      mine: this.loadMine()
    }).pipe(
      switchMap(({ course, mine }) => {
        const entry = mine.find(c => c.enrollment.courseId === req.courseId);
        if (!entry) return throwError(() => new Error('No estás matriculado en este curso'));
        const existing = (entry.data.submissions ?? []).find(s => s.blockId === req.blockId);
        const submission: IAssignmentSubmission = {
          id: existing?.id ?? `sub-${entry.enrollment.id}-${req.blockId}`,
          blockId: req.blockId,
          lessonId: req.lessonId,
          courseId: req.courseId,
          textContent: req.textContent,
          fileUrls: req.fileUrls,
          submittedAt: new Date(),
          status: 'pending'
        };
        return this.writeData(entry.enrollment.id, data => ({
          ...data,
          submissions: [...(data.submissions ?? []).filter(s => s.blockId !== req.blockId), submission]
        })).pipe(
          map(() => {
            const user = this.session.user();
            const blockTitle = course.modules.flatMap(m => m.lessons).flatMap(l => l.contentBlocks)
              .find(b => b.id === req.blockId)?.title ?? 'una tarea';
            this.notifications.notifySubmission(
              user ? `${user.firstName} ${user.lastName}` : 'Un estudiante',
              blockTitle, course.title, req.courseId, submission.id
            );
            return submission;
          })
        );
      })
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
    return this.courseService.getCourses().pipe(
      switchMap(res => res.courses.length
        ? forkJoin(res.courses.map(c => this.getEnrollmentsByCourse(c.id)))
        : of([])),
      map(lists => lists.flat())
    );
  }

  getAllSubmissions(): Observable<(IAssignmentSubmission & { student: IStudentProfile })[]> {
    return this.getAllCourseEnrollments().pipe(
      map(enrollments => enrollments.flatMap(e =>
        (this.cache.get(e.id)?.data.submissions ?? []).map(s => ({ ...s, student: e.student }))
      ))
    );
  }

  gradeSubmission(submissionId: string, grade: number, feedback: string): Observable<IAssignmentSubmission> {
    const entry = [...this.cache.values()].find(c => c.data.submissions?.some(s => s.id === submissionId));
    if (!entry) return throwError(() => new Error('Entrega no encontrada. Recarga la lista.'));
    let graded!: IAssignmentSubmission;
    return this.writeData(entry.enrollment.id, data => ({
      ...data,
      submissions: (data.submissions ?? []).map(s => {
        if (s.id !== submissionId) return s;
        graded = { ...s, grade, feedback, status: 'graded' };
        return graded;
      })
    })).pipe(map(() => {
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
          }))
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
    const userId = this.session.user()?.id;
    if (!userId) return throwError(() => new Error('Inicia sesión para matricularte'));
    const all = this.readPathEnrollments();
    const existing = all.find(e => e.learningPathId === pathId && e.userId === userId);
    if (existing) return of(existing);
    const enrollment: ILearningPathEnrollment = {
      id: `penr-${Date.now()}`, userId, learningPathId: pathId,
      status: 'active', enrolledAt: new Date(), completedCourseIds: [], overallPercentage: 0
    };
    this.writePathEnrollments([...all, enrollment]);
    return of(enrollment);
  }

  getMyPathEnrollments(): Observable<ILearningPathEnrollment[]> {
    const userId = this.session.user()?.id;
    return of(this.readPathEnrollments().filter(e => e.userId === userId));
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
      })
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

  // Path enrollments have no API yet; they are kept in this browser only.
  private readPathEnrollments(): ILearningPathEnrollment[] {
    if (!this.isBrowser) return [];
    try {
      const raw = localStorage.getItem(PATH_ENROLLMENTS_KEY);
      return raw ? (JSON.parse(raw) as ILearningPathEnrollment[]).map(e => reviveDates(e, ['enrolledAt', 'completedAt'])) : [];
    } catch {
      return [];
    }
  }

  private writePathEnrollments(list: ILearningPathEnrollment[]): void {
    if (!this.isBrowser) return;
    try { localStorage.setItem(PATH_ENROLLMENTS_KEY, JSON.stringify(list)); } catch { /* storage unavailable */ }
  }
}
