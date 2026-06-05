import { inject, Injectable, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, EMPTY } from 'rxjs';
import { tap, switchMap, catchError } from 'rxjs/operators';
import { LearningPathState } from '../domain/state/learning-path.state';
import { LearningPathService } from '../infrastructure/services/learning-path.service';
import { ToastService } from '@gems-lms-web/shared';
import {
  ILearningPath,
  ICreateLearningPathRequest,
  IUpdateLearningPathRequest,
  ELearningPathStatus
} from '../domain/model/learning-path.model';

export type TLearningPathModalMode = 'create' | 'edit' | 'delete' | null;

@Injectable({ providedIn: 'root' })
export class LearningPathUseCase {
  private readonly destroyRef = inject(DestroyRef);
  private readonly lpState = inject(LearningPathState);
  private readonly lpService = inject(LearningPathService);
  private readonly toastService = inject(ToastService);

  //#region State
  readonly learningPaths = this.lpState.learningPaths;
  readonly selectedLearningPath = this.lpState.selectedLearningPath;

  private readonly _isLoading = signal(false);
  private readonly _isSaving = signal(false);
  private readonly _isDeleting = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _searchTerm = signal('');
  private readonly _statusFilter = signal<ELearningPathStatus | null>(null);
  private readonly _pagination = signal({ page: 1, limit: 12, total: 0 });
  private readonly _modal = signal<{ isOpen: boolean; mode: TLearningPathModalMode; lpId: string | null }>({
    isOpen: false, mode: null, lpId: null
  });

  readonly isLoading = computed(() => this._isLoading());
  readonly isSaving = computed(() => this._isSaving());
  readonly isDeleting = computed(() => this._isDeleting());
  readonly error = computed(() => this._error());
  readonly searchTerm = computed(() => this._searchTerm());
  readonly statusFilter = computed(() => this._statusFilter());
  readonly pagination = computed(() => this._pagination());
  readonly modal = computed(() => this._modal());

  readonly filteredPaths = computed(() => {
    const term = this._searchTerm().toLowerCase();
    const status = this._statusFilter();
    return this.learningPaths().filter(lp => {
      const matchesTerm = !term || lp.title.toLowerCase().includes(term) || lp.tags.some(t => t.toLowerCase().includes(term));
      const matchesStatus = !status || lp.status === status;
      return matchesTerm && matchesStatus;
    });
  });

  readonly stats = computed(() => {
    const all = this.learningPaths();
    return {
      total: all.length,
      published: all.filter(lp => lp.status === ELearningPathStatus.PUBLISHED).length,
      draft: all.filter(lp => lp.status === ELearningPathStatus.DRAFT).length,
      totalEnrolled: all.reduce((s, lp) => s + lp.enrolledCount, 0)
    };
  });
  //#endregion

  //#region Action subjects
  private readonly load$ = new Subject<{ page?: number }>();
  private readonly create$ = new Subject<ICreateLearningPathRequest>();
  private readonly update$ = new Subject<{ id: string; req: IUpdateLearningPathRequest }>();
  private readonly delete$ = new Subject<string>();
  //#endregion

  constructor() {
    this.load$.pipe(
      tap(() => this._isLoading.set(true)),
      switchMap(({ page = 1 }) =>
        this.lpService.getLearningPaths(page).pipe(
          tap(res => {
            this.lpState.setLearningPaths(res.learningPaths);
            this._pagination.set({ page: res.page, limit: res.limit, total: res.total });
            this._isLoading.set(false);
            this._error.set(null);
          }),
          catchError(err => {
            this._error.set(err.message ?? 'Error cargando rutas de aprendizaje');
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
        this.lpService.createLearningPath(req).pipe(
          tap(lp => {
            this.lpState.setLearningPaths([lp, ...this.learningPaths()]);
            this._isSaving.set(false);
            this.closeModal();
            this.toastService.success('Ruta de aprendizaje creada exitosamente');
          }),
          catchError(err => {
            this._error.set(err.message ?? 'Error creando ruta');
            this._isSaving.set(false);
            this.toastService.error(err.message ?? 'Error creando ruta');
            return EMPTY;
          })
        )
      ),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    this.update$.pipe(
      tap(() => this._isSaving.set(true)),
      switchMap(({ id, req }) =>
        this.lpService.updateLearningPath(id, req).pipe(
          tap(lp => {
            this.lpState.updateLearningPath(lp);
            this._isSaving.set(false);
            this.closeModal();
            this.toastService.success('Ruta de aprendizaje actualizada');
          }),
          catchError(err => {
            this._error.set(err.message ?? 'Error actualizando ruta');
            this._isSaving.set(false);
            this.toastService.error(err.message ?? 'Error actualizando ruta');
            return EMPTY;
          })
        )
      ),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    this.delete$.pipe(
      tap(() => this._isDeleting.set(true)),
      switchMap(id =>
        this.lpService.deleteLearningPath(id).pipe(
          tap(() => {
            this.lpState.removeLearningPath(id);
            this._isDeleting.set(false);
            this.closeModal();
            this.toastService.success('Ruta de aprendizaje eliminada');
          }),
          catchError(err => {
            this._error.set(err.message ?? 'Error eliminando ruta');
            this._isDeleting.set(false);
            this.toastService.error(err.message ?? 'Error eliminando ruta');
            return EMPTY;
          })
        )
      ),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }

  //#region Public API
  load(page = 1): void { this.load$.next({ page }); }

  create(req: ICreateLearningPathRequest): void { this.create$.next(req); }

  update(id: string, req: IUpdateLearningPathRequest): void { this.update$.next({ id, req }); }

  delete(id: string): void { this.delete$.next(id); }

  selectLearningPath(lp: ILearningPath | null): void { this.lpState.setSelectedLearningPath(lp); }

  setSearch(term: string): void { this._searchTerm.set(term); }

  setStatusFilter(status: ELearningPathStatus | null): void { this._statusFilter.set(status); }

  openModal(mode: TLearningPathModalMode, lpId?: string): void {
    this._modal.set({ isOpen: true, mode, lpId: lpId ?? null });
    if (lpId) {
      const lp = this.learningPaths().find(l => l.id === lpId);
      if (lp) this.lpState.setSelectedLearningPath(lp);
    }
  }

  closeModal(): void {
    this._modal.set({ isOpen: false, mode: null, lpId: null });
    this.lpState.setSelectedLearningPath(null);
  }

  publishPath(id: string): void {
    this.update$.next({ id, req: { status: ELearningPathStatus.PUBLISHED } });
  }

  archivePath(id: string): void {
    this.update$.next({ id, req: { status: ELearningPathStatus.ARCHIVED } });
  }
  //#endregion
}
