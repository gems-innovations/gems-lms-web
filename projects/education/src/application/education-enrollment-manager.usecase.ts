import { inject, Injectable, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, EMPTY, forkJoin } from 'rxjs';
import { tap, switchMap, catchError } from 'rxjs/operators';
import { ToastService } from 'shared';
import { CourseService } from '../infrastructure/services/course.service';
import { EnrollmentService, IStudentProfile } from '../infrastructure/services/enrollment.service';
import { ICourse } from '../domain/model/course.model';
import { IBulkEnrollEntry, IBulkResult, TEnrollTab } from '../domain/model/enrollment.model';

@Injectable({ providedIn: 'root' })
export class EducationEnrollmentManagerUseCase {
  private readonly destroyRef        = inject(DestroyRef);
  private readonly courseService     = inject(CourseService);
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly toast             = inject(ToastService);

  private readonly _courses          = signal<ICourse[]>([]);
  private readonly _students         = signal<IStudentProfile[]>([]);
  private readonly _isLoading        = signal(true);
  private readonly _bulkResult       = signal<IBulkResult | null>(null);
  private readonly _activeTab        = signal<TEnrollTab>('individual');
  private readonly _selectedStudent  = signal<IStudentProfile | null>(null);
  private readonly _selectedCourse   = signal('');
  private readonly _bulkText         = signal('');
  private readonly _bulkCourseId     = signal('');

  readonly courses         = computed(() => this._courses());
  readonly students        = computed(() => this._students());
  readonly isLoading       = computed(() => this._isLoading());
  readonly bulkResult      = computed(() => this._bulkResult());
  readonly activeTab       = computed(() => this._activeTab());
  readonly selectedStudent = computed(() => this._selectedStudent());
  readonly selectedCourse  = computed(() => this._selectedCourse());
  readonly bulkText        = computed(() => this._bulkText());
  readonly bulkCourseId    = computed(() => this._bulkCourseId());

  readonly bulkEntries = computed((): IBulkEnrollEntry[] => {
    const cid = this._bulkCourseId();
    return this._bulkText()
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.includes('@'))
      .map(email => ({ email, courseId: cid }));
  });

  private readonly load$         = new Subject<void>();
  private readonly enrollSingle$ = new Subject<void>();
  private readonly bulkEnroll$   = new Subject<void>();

  constructor() {
    this.load$.pipe(
      tap(() => this._isLoading.set(true)),
      switchMap(() => forkJoin({
        courses:  this.courseService.getCourses(),
        students: this.enrollmentService.getStudents(),
      }).pipe(
        tap(({ courses, students }) => {
          this._courses.set(courses.courses);
          this._students.set(students);
          this._isLoading.set(false);
        }),
        catchError(() => { this._isLoading.set(false); this.toast.error('No se pudieron cargar las matrículas. Reintenta.'); return EMPTY; })
      )),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    this.enrollSingle$.pipe(
      switchMap(() => {
        const s = this._selectedStudent();
        const c = this._selectedCourse();
        if (!s || !c) return EMPTY;
        return this.enrollmentService.enrollStudent(s.id, c).pipe(
          tap(() => {
            this._bulkResult.set({ success: 1, skipped: 0, errors: [] });
            this._selectedStudent.set(null);
            this._selectedCourse.set('');
            setTimeout(() => this._bulkResult.set(null), 4000);
          }),
          catchError(() => { this.toast.error('No se pudo matricular al estudiante. Revisa el curso y vuelve a intentarlo.'); return EMPTY; })
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    this.bulkEnroll$.pipe(
      switchMap(() => {
        const entries = this.bulkEntries();
        if (!entries.length || !this._bulkCourseId()) return EMPTY;
        return this.enrollmentService.bulkEnroll(entries).pipe(
          tap(result => this._bulkResult.set(result)),
          catchError(() => { this.toast.error('No se pudo completar la matrícula masiva. Revisa los datos y vuelve a intentarlo.'); return EMPTY; })
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }

  load(): void { this.load$.next(); }

  setActiveTab(tab: TEnrollTab): void { this._activeTab.set(tab); }
  selectStudent(s: IStudentProfile): void { this._selectedStudent.set(s); }
  clearStudent(): void { this._selectedStudent.set(null); }
  setSelectedCourse(id: string): void { this._selectedCourse.set(id); }
  setBulkText(text: string): void { this._bulkText.set(text); }
  setBulkCourseId(id: string): void { this._bulkCourseId.set(id); }

  initials(s: IStudentProfile): string {
    return (s.firstName[0] + s.lastName[0]).toUpperCase();
  }

  enrollSingle(): void { this.enrollSingle$.next(); }
  submitBulk(): void { this.bulkEnroll$.next(); }
}
