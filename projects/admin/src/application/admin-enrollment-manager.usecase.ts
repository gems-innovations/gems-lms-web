import { inject, Injectable, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, EMPTY, forkJoin } from 'rxjs';
import { tap, switchMap, catchError } from 'rxjs/operators';
import { ToastService } from 'shared';
import {
  EnrollmentService,
  CourseService,
  LearningPathService,
  ICourse,
  ILearningPath,
  IStudentProfile,
} from 'education';

export type TEnrollTarget = 'course' | 'path';
export interface IAdminEnrollResult { success: number; skipped: number; }

@Injectable({ providedIn: 'root' })
export class AdminEnrollmentManagerUseCase {
  private readonly destroyRef       = inject(DestroyRef);
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly courseService     = inject(CourseService);
  private readonly pathService       = inject(LearningPathService);
  private readonly toast             = inject(ToastService);

  private readonly _courses     = signal<ICourse[]>([]);
  private readonly _paths       = signal<ILearningPath[]>([]);
  private readonly _students    = signal<IStudentProfile[]>([]);
  private readonly _isLoading   = signal(true);
  private readonly _result      = signal<IAdminEnrollResult | null>(null);
  private readonly _selectedIds = signal<Set<string>>(new Set());
  private readonly _targetType  = signal<TEnrollTarget>('course');
  private readonly _targetId    = signal('');

  readonly courses          = computed(() => this._courses());
  readonly paths            = computed(() => this._paths());
  readonly students         = computed(() => this._students());
  readonly isLoading        = computed(() => this._isLoading());
  readonly result           = computed(() => this._result());
  readonly selectedIds      = computed(() => this._selectedIds());
  readonly targetType       = computed(() => this._targetType());
  readonly targetId         = computed(() => this._targetId());

  readonly selectedStudents = computed(() =>
    this._students().filter(s => this._selectedIds().has(s.id))
  );
  readonly canEnroll = computed(() => this._selectedIds().size > 0 && !!this._targetId());

  private readonly load$   = new Subject<void>();
  private readonly enroll$ = new Subject<void>();

  constructor() {
    this.load$.pipe(
      tap(() => this._isLoading.set(true)),
      switchMap(() => forkJoin({
        courses:  this.courseService.getCourses(),
        paths:    this.pathService.getLearningPaths(),
        students: this.enrollmentService.getStudents(),
      }).pipe(
        tap(({ courses, paths, students }) => {
          this._courses.set(courses.courses);
          this._paths.set(paths.learningPaths);
          this._students.set(students);
          this._isLoading.set(false);
        }),
        catchError(() => { this._isLoading.set(false); this.toast.error('No se pudieron cargar los datos de matrículas. Reintenta.'); return EMPTY; })
      )),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    this.enroll$.pipe(
      switchMap(() =>
        this.enrollmentService
          .enrollStudents([...this._selectedIds()], this._targetId(), this._targetType())
          .pipe(
            tap(r => {
              this._result.set(r);
              this._selectedIds.set(new Set());
              this._targetId.set('');
              setTimeout(() => this._result.set(null), 5000);
            }),
            catchError(() => { this.toast.error('No se pudo completar la matrícula. Revisa los estudiantes seleccionados e inténtalo de nuevo.'); return EMPTY; })
          )
      ),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }

  load(): void { this.load$.next(); }

  toggleStudent(s: IStudentProfile): void {
    this._selectedIds.update(set => {
      const next = new Set(set);
      next.has(s.id) ? next.delete(s.id) : next.add(s.id);
      return next;
    });
  }

  removeStudent(id: string): void {
    this._selectedIds.update(set => { const n = new Set(set); n.delete(id); return n; });
  }

  setTargetType(type: TEnrollTarget): void {
    this._targetType.set(type);
    this._targetId.set('');
  }

  setTargetId(id: string): void { this._targetId.set(id); }

  initials(s: IStudentProfile): string {
    return (s.firstName[0] + s.lastName[0]).toUpperCase();
  }

  enroll(): void { if (this.canEnroll()) this.enroll$.next(); }
}
