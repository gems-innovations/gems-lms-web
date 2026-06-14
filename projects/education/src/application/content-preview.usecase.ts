import { inject, Injectable, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, EMPTY, forkJoin, tap, Observable } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { CourseService } from '../infrastructure/services/course.service';
import { LearningPathService } from '../infrastructure/services/learning-path.service';
import { EnrollmentService } from '../infrastructure/services/enrollment.service';
import { ICourse } from '../domain/model/course.model';
import { ILearningPath } from '../domain/model/learning-path.model';
import { TPreviewType } from '../domain/model/catalog.model';

@Injectable({ providedIn: 'root' })
export class ContentPreviewUseCase {
  private readonly destroyRef = inject(DestroyRef);
  private readonly courseService = inject(CourseService);
  private readonly pathService = inject(LearningPathService);
  private readonly enrollmentService = inject(EnrollmentService);

  private readonly _previewType = signal<TPreviewType>('course');
  private readonly _course = signal<ICourse | null>(null);
  private readonly _path = signal<ILearningPath | null>(null);
  private readonly _isEnrolled = signal(false);
  private readonly _isLoading = signal(true);
  private readonly _currentCourseId = signal<string | null>(null);

  readonly previewType = computed(() => this._previewType());
  readonly course = computed(() => this._course());
  readonly path = computed(() => this._path());
  readonly isEnrolled = computed(() => this._isEnrolled());
  readonly isLoading = computed(() => this._isLoading());
  readonly currentCourseId = computed(() => this._currentCourseId());

  private readonly init$ = new Subject<{ type: TPreviewType; id: string }>();
  private readonly enroll$ = new Subject<void>();

  constructor() {
    this.init$.pipe(
      tap(() => this._isLoading.set(true)),
      switchMap(({ type, id }) => {
        if (type === 'course') {
          return forkJoin({
            content: this.courseService.getCourseById(id),
            enrollments: this.enrollmentService.getMyEnrollments(),
          }).pipe(
            tap(({ content, enrollments }) => {
              this._course.set(content);
              this._isEnrolled.set(enrollments.some(e => e.courseId === id));
              this._isLoading.set(false);
            }),
            catchError(() => { this._isLoading.set(false); return EMPTY; })
          );
        } else {
          return forkJoin({
            content: this.pathService.getLearningPathById(id),
            enrollments: this.enrollmentService.getMyPathEnrollments(),
          }).pipe(
            tap(({ content, enrollments }) => {
              this._path.set(content);
              const pathEnrollment = enrollments.find(e => e.learningPathId === id);
              this._isEnrolled.set(!!pathEnrollment);
              const firstStep = content.steps.sort((a, b) => a.order - b.order)[0];
              this._currentCourseId.set(
                pathEnrollment?.currentCourseId ?? firstStep?.courseId ?? null
              );
              this._isLoading.set(false);
            }),
            catchError(() => { this._isLoading.set(false); return EMPTY; })
          );
        }
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    this.enroll$.pipe(
      switchMap(() => {
        const type = this._previewType();
        const id = type === 'course' ? this._course()?.id : this._path()?.id;
        if (!id) return EMPTY;
        const obs$: Observable<unknown> = type === 'course'
          ? this.enrollmentService.enrollInCourse(id)
          : this.enrollmentService.enrollInPath(id);
        return obs$.pipe(
          tap(_result => { this._isEnrolled.set(true); }),
          catchError(() => EMPTY)
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }

  init(type: TPreviewType, id: string): void {
    this._previewType.set(type);
    this.init$.next({ type, id });
  }

  enroll(): void { this.enroll$.next(); }
}
