import { inject, Injectable, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, EMPTY } from 'rxjs';
import { tap, switchMap, catchError } from 'rxjs/operators';
import { EnrollmentState } from '../domain/state/enrollment.state';
import { EnrollmentService } from '../infrastructure/services/enrollment.service';
import { ToastService } from '@gems-lms-web/shared';
import {
  IEnrollment,
  IQuizAttempt,
  IAssignmentSubmission,
  ISubmitQuizRequest,
  ISubmitAssignmentRequest
} from '../domain/model/enrollment.model';

@Injectable({ providedIn: 'root' })
export class EnrollmentUseCase {
  private readonly destroyRef = inject(DestroyRef);
  private readonly state = inject(EnrollmentState);
  private readonly service = inject(EnrollmentService);
  private readonly toastService = inject(ToastService);

  //#region State
  readonly enrollments = this.state.enrollments;
  readonly pathEnrollments = this.state.pathEnrollments;
  readonly quizAttempts = this.state.quizAttempts;
  readonly submissions = this.state.submissions;

  private readonly _isLoading = signal(false);
  private readonly _isSubmitting = signal(false);
  private readonly _activeEnrollment = signal<IEnrollment | null>(null);
  private readonly _lastQuizResult = signal<IQuizAttempt | null>(null);
  private readonly _lastSubmission = signal<IAssignmentSubmission | null>(null);

  readonly isLoading = computed(() => this._isLoading());
  readonly isSubmitting = computed(() => this._isSubmitting());
  readonly activeEnrollment = computed(() => this._activeEnrollment());
  readonly lastQuizResult = computed(() => this._lastQuizResult());
  readonly lastSubmission = computed(() => this._lastSubmission());

  readonly enrolledCourseIds = computed(() =>
    new Set(this.enrollments().map(e => e.courseId))
  );

  readonly inProgressEnrollments = computed(() =>
    this.enrollments().filter(e => e.status === 'active')
      .sort((a, b) => b.progress.lastAccessedAt.getTime() - a.progress.lastAccessedAt.getTime())
  );

  readonly completedEnrollments = computed(() =>
    this.enrollments().filter(e => e.status === 'completed')
  );
  //#endregion

  //#region Action subjects
  private readonly loadEnrollments$ = new Subject<void>();
  private readonly loadPathEnrollments$ = new Subject<void>();
  private readonly enroll$ = new Subject<string>();
  private readonly submitQuiz$ = new Subject<ISubmitQuizRequest>();
  private readonly submitAssignment$ = new Subject<ISubmitAssignmentRequest>();
  private readonly updateProgress$ = new Subject<{ enrollmentId: string; lessonId: string; blockId: string }>();
  //#endregion

  constructor() {
    this.loadEnrollments$.pipe(
      tap(() => this._isLoading.set(true)),
      switchMap(() => this.service.getMyEnrollments().pipe(
        tap(enrollments => {
          this.state.setEnrollments(enrollments);
          this._isLoading.set(false);
        }),
        catchError(() => { this._isLoading.set(false); return EMPTY; })
      )),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    this.loadPathEnrollments$.pipe(
      switchMap(() => this.service.getMyPathEnrollments().pipe(
        tap(pathEnrollments => this.state.setPathEnrollments(pathEnrollments)),
        catchError(() => EMPTY)
      )),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    this.enroll$.pipe(
      switchMap(courseId => this.service.enrollInCourse(courseId).pipe(
        tap(enrollment => {
          this.state.addEnrollment(enrollment);
          this._activeEnrollment.set(enrollment);
          this.toastService.success('¡Te has matriculado en el curso!');
        }),
        catchError(err => {
          this.toastService.error(err.message ?? 'Error al matricularse');
          return EMPTY;
        })
      )),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    this.submitQuiz$.pipe(
      tap(() => this._isSubmitting.set(true)),
      switchMap(req => this.service.submitQuiz(req).pipe(
        tap(attempt => {
          this.state.addQuizAttempt(attempt);
          this._lastQuizResult.set(attempt);
          this._isSubmitting.set(false);
          if (attempt.passed) {
            this.toastService.success(`¡Aprobado! Puntuación: ${attempt.score}%`);
          } else {
            this.toastService.error(`No aprobado (${attempt.score}%). Sigue intentando.`);
          }
        }),
        catchError(err => {
          this._isSubmitting.set(false);
          this.toastService.error(err.message ?? 'Error al enviar quiz');
          return EMPTY;
        })
      )),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    this.submitAssignment$.pipe(
      tap(() => this._isSubmitting.set(true)),
      switchMap(req => this.service.submitAssignment(req).pipe(
        tap(submission => {
          this.state.addSubmission(submission);
          this._lastSubmission.set(submission);
          this._isSubmitting.set(false);
          this.toastService.success('Tarea enviada correctamente');
        }),
        catchError(err => {
          this._isSubmitting.set(false);
          this.toastService.error(err.message ?? 'Error al enviar tarea');
          return EMPTY;
        })
      )),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    this.updateProgress$.pipe(
      switchMap(({ enrollmentId, lessonId, blockId }) => {
        const enrollment = this.enrollments().find(e => e.id === enrollmentId);
        if (!enrollment) return EMPTY;
        return this.service.updateProgress(enrollmentId, {
          currentLessonId: lessonId,
          currentBlockId: blockId
        }).pipe(
          tap(updated => this.state.updateEnrollment(updated)),
          catchError(() => EMPTY)
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }

  //#region Public API
  loadEnrollments(): void { this.loadEnrollments$.next(); }

  loadPathEnrollments(): void { this.loadPathEnrollments$.next(); }

  enroll(courseId: string): void { this.enroll$.next(courseId); }

  submitQuiz(req: ISubmitQuizRequest): void { this.submitQuiz$.next(req); }

  submitAssignment(req: ISubmitAssignmentRequest): void { this.submitAssignment$.next(req); }

  updateProgress(enrollmentId: string, lessonId: string, blockId: string): void {
    this.updateProgress$.next({ enrollmentId, lessonId, blockId });
  }

  getEnrollmentByCourse(courseId: string): IEnrollment | null {
    return this.enrollments().find(e => e.courseId === courseId) ?? null;
  }

  isEnrolled(courseId: string): boolean {
    return this.enrolledCourseIds().has(courseId);
  }

  clearLastQuizResult(): void { this._lastQuizResult.set(null); }

  clearLastSubmission(): void { this._lastSubmission.set(null); }
  //#endregion
}
