import { inject, Injectable, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, EMPTY } from 'rxjs';
import { tap, switchMap, concatMap, catchError } from 'rxjs/operators';
import { CourseState } from '../domain/state/course.state';
import { CourseService } from '../infrastructure/services/course.service';
import { ToastService } from '@gems-lms-web/shared';
import {
  ICourse,
  ICourseModule,
  ILesson,
  ICreateCourseRequest,
  IUpdateCourseRequest,
  ICreateModuleRequest,
  ICreateLessonRequest,
  ICreateContentBlockRequest,
  ICourseFilters,
  ECourseStatus
} from '../domain/model/course.model';

export type TCourseModalMode = 'create' | 'edit' | 'delete' | null;

@Injectable({ providedIn: 'root' })
export class CourseUseCase {
  private readonly destroyRef = inject(DestroyRef);
  private readonly courseState = inject(CourseState);
  private readonly courseService = inject(CourseService);
  private readonly toastService = inject(ToastService);

  //#region State
  readonly courses = this.courseState.courses;
  readonly selectedCourse = this.courseState.selectedCourse;

  private readonly _isLoading = signal(false);
  private readonly _isSaving = signal(false);
  private readonly _isDeleting = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _searchTerm = signal('');
  private readonly _statusFilter = signal<ECourseStatus | null>(null);
  private readonly _pagination = signal({ page: 1, limit: 12, total: 0 });
  private readonly _modal = signal<{ isOpen: boolean; mode: TCourseModalMode; courseId: string | null }>({
    isOpen: false, mode: null, courseId: null
  });

  readonly isLoading = computed(() => this._isLoading());
  readonly isSaving = computed(() => this._isSaving());
  readonly isDeleting = computed(() => this._isDeleting());
  readonly error = computed(() => this._error());
  readonly searchTerm = computed(() => this._searchTerm());
  readonly statusFilter = computed(() => this._statusFilter());
  readonly pagination = computed(() => this._pagination());
  readonly modal            = computed(() => this._modal());
  readonly showDeleteDialog = computed(() => {
    const m = this._modal();
    return m.isOpen && m.mode === 'delete';
  });

  readonly filteredCourses = computed(() => {
    const term = this._searchTerm().toLowerCase();
    const status = this._statusFilter();
    return this.courses().filter(c => {
      const matchesTerm = !term || c.title.toLowerCase().includes(term) || c.tags.some(t => t.toLowerCase().includes(term));
      const matchesStatus = !status || c.status === status;
      return matchesTerm && matchesStatus;
    });
  });

  readonly stats = computed(() => {
    const all = this.courses();
    return {
      total: all.length,
      published: all.filter(c => c.status === ECourseStatus.PUBLISHED).length,
      draft: all.filter(c => c.status === ECourseStatus.DRAFT).length,
      totalEnrolled: all.reduce((s, c) => s + c.enrolledCount, 0)
    };
  });
  //#endregion

  //#region Actions subjects
  private readonly load$ = new Subject<{ filters?: ICourseFilters; page?: number }>();
  private readonly create$ = new Subject<ICreateCourseRequest>();
  private readonly update$ = new Subject<{ id: string; req: IUpdateCourseRequest }>();
  private readonly delete$ = new Subject<string>();
  private readonly addModule$ = new Subject<ICreateModuleRequest>();
  private readonly addLesson$ = new Subject<ICreateLessonRequest>();
  private readonly addBlock$ = new Subject<ICreateContentBlockRequest>();
  //#endregion

  constructor() {
    this.load$.pipe(
      tap(() => this._isLoading.set(true)),
      switchMap(({ filters, page = 1 }) =>
        this.courseService.getCourses(filters, page).pipe(
          tap(res => {
            this.courseState.setCourses(res.courses);
            this._pagination.set({ page: res.page, limit: res.limit, total: res.total });
            this._isLoading.set(false);
            this._error.set(null);
          }),
          catchError(err => {
            this._error.set(err.message ?? 'Error cargando cursos');
            this._isLoading.set(false);
            return EMPTY;
          })
        )
      ),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    this.create$.pipe(
      tap(() => this._isSaving.set(true)),
      switchMap(req =>
        this.courseService.createCourse(req).pipe(
          tap(course => {
            this.courseState.setCourses([course, ...this.courses()]);
            this._isSaving.set(false);
            this.closeModal();
            this.toastService.success('Curso creado exitosamente');
          }),
          catchError(err => {
            this._error.set(err.message ?? 'Error creando curso');
            this._isSaving.set(false);
            this.toastService.error(err.message ?? 'Error creando curso');
            return EMPTY;
          })
        )
      ),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    this.update$.pipe(
      tap(() => this._isSaving.set(true)),
      switchMap(({ id, req }) =>
        this.courseService.updateCourse(id, req).pipe(
          tap(course => {
            this.courseState.updateCourse(course);
            this._isSaving.set(false);
            this.closeModal();
            this.toastService.success('Curso actualizado exitosamente');
          }),
          catchError(err => {
            this._error.set(err.message ?? 'Error actualizando curso');
            this._isSaving.set(false);
            this.toastService.error(err.message ?? 'Error actualizando curso');
            return EMPTY;
          })
        )
      ),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    this.delete$.pipe(
      tap(() => this._isDeleting.set(true)),
      switchMap(id =>
        this.courseService.deleteCourse(id).pipe(
          tap(() => {
            this.courseState.removeCourse(id);
            this._isDeleting.set(false);
            this.closeModal();
            this.toastService.success('Curso eliminado');
          }),
          catchError(err => {
            this._error.set(err.message ?? 'Error eliminando curso');
            this._isDeleting.set(false);
            this.toastService.error(err.message ?? 'Error eliminando curso');
            return EMPTY;
          })
        )
      ),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    // Tree edits are queued (concatMap): each one reads and rewrites the whole course
    // tree, so running them in parallel or cancelling one would lose changes.
    this.addModule$.pipe(
      concatMap(req =>
        this.courseService.addModule(req).pipe(
          tap(course => {
            this.courseState.updateCourse(course);
            this.toastService.success('Módulo añadido');
          }),
          catchError(err => { this.toastService.error(err.message ?? 'Error'); return EMPTY; })
        )
      ),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    this.addLesson$.pipe(
      concatMap(req =>
        this.courseService.addLesson(req).pipe(
          tap(course => {
            this.courseState.updateCourse(course);
            this.toastService.success('Lección añadida');
          }),
          catchError(err => { this.toastService.error(err.message ?? 'Error'); return EMPTY; })
        )
      ),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    this.addBlock$.pipe(
      concatMap(req =>
        this.courseService.addContentBlock(req).pipe(
          tap(course => {
            this.courseState.updateCourse(course);
            this.toastService.success('Contenido añadido');
          }),
          catchError(err => { this.toastService.error(err.message ?? 'Error'); return EMPTY; })
        )
      ),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }

  //#region Public API
  load(filters?: ICourseFilters, page = 1): void { this.load$.next({ filters, page }); }

  create(req: ICreateCourseRequest): void { this.create$.next(req); }

  update(id: string, req: IUpdateCourseRequest): void { this.update$.next({ id, req }); }

  delete(id: string): void { this.delete$.next(id); }

  addModule(req: ICreateModuleRequest): void { this.addModule$.next(req); }

  addLesson(req: ICreateLessonRequest): void { this.addLesson$.next(req); }

  addContentBlock(req: ICreateContentBlockRequest): void { this.addBlock$.next(req); }

  selectCourse(course: ICourse | null): void { this.courseState.setSelectedCourse(course); }

  setSearch(term: string): void { this._searchTerm.set(term); }

  setStatusFilter(status: ECourseStatus | null): void { this._statusFilter.set(status); }

  openModal(mode: TCourseModalMode, courseId?: string): void {
    this._modal.set({ isOpen: true, mode, courseId: courseId ?? null });
    if (courseId) {
      const course = this.courses().find(c => c.id === courseId);
      if (course) this.courseState.setSelectedCourse(course);
    }
  }

  closeModal(): void {
    this._modal.set({ isOpen: false, mode: null, courseId: null });
    this.courseState.setSelectedCourse(null);
  }

  publishCourse(id: string): void {
    this.update$.next({ id, req: { status: ECourseStatus.PUBLISHED } });
  }

  archiveCourse(id: string): void {
    this.update$.next({ id, req: { status: ECourseStatus.ARCHIVED } });
  }
  //#endregion
}
