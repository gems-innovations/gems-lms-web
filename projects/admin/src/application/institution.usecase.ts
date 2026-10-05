import { inject, Injectable, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InstitutionState } from '../domain/state/institution.state';
import { InstitutionService } from '../infrastructure/services/institution.service';
import { ToastService } from '@gems-lms-web/shared';
import { AuthSessionService } from 'auth';
import { Subject, EMPTY } from 'rxjs';
import { tap, switchMap, catchError } from 'rxjs/operators';
import {
  ICreateInstitutionRequest,
  IUpdateInstitutionRequest,
  IInstitutionFilters,
  IInstitution,
  EInstitutionType,
  ESubscriptionType
} from '../domain/model/institution.model';

export interface IDashboardMetrics {
  totalInstitutions: number;
  totalActiveStudents: number;
  completionRate: number;
  peakSystemUsage: number;
}

export interface IPaginationInfo {
  page: number;
  limit: number;
  total: number;
}

export type TModalMode = 'create' | 'edit' | 'view' | 'delete' | null;

export interface IModalState {
  isOpen: boolean;
  mode: TModalMode;
  institutionId: string | null;
}

@Injectable({ providedIn: 'root' })
export class InstitutionUseCase {
  private readonly destroyRef         = inject(DestroyRef);
  private readonly institutionService = inject(InstitutionService);
  private readonly institutionState   = inject(InstitutionState);
  private readonly toastService       = inject(ToastService);
  private readonly authSession        = inject(AuthSessionService);

  //#region State
  readonly institutions = this.institutionState.institutions;
  readonly selectedInstitution = this.institutionState.selectedInstitution;

  private readonly _isLoading = signal<boolean>(false);
  private readonly _isCreating = signal<boolean>(false);
  private readonly _isUpdating = signal<boolean>(false);
  private readonly _isDeleting = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);
  private readonly _searchTerm = signal<string>('');
  private readonly _pagination = signal<IPaginationInfo>({ page: 1, limit: 10, total: 0 });
  private readonly _dashboardMetrics = signal<IDashboardMetrics>({
    totalInstitutions: 0,
    totalActiveStudents: 0,
    completionRate: 0,
    peakSystemUsage: 0
  });
  private readonly _modal = signal<IModalState>({
    isOpen: false,
    mode: null,
    institutionId: null
  });

  readonly isLoading = computed(() => this._isLoading());
  readonly isCreating = computed(() => this._isCreating());
  readonly isUpdating = computed(() => this._isUpdating());
  readonly isDeleting = computed(() => this._isDeleting());
  readonly error = computed(() => this._error());
  readonly searchTerm = computed(() => this._searchTerm());
  readonly pagination = computed(() => this._pagination());
  readonly dashboardMetrics = computed(() => this._dashboardMetrics());
  readonly modal = computed(() => this._modal());

  readonly currentInstitutionId = computed(() => this.authSession.institutionId());

  readonly currentInstitution = computed((): IInstitution | null => {
    const id = this.authSession.institutionId();
    return id ? (this.institutions().find(i => i.id === id) ?? null) : null;
  });

  readonly institutionForModal = computed((): IInstitution | null => {
    const { isOpen, institutionId } = this._modal();
    if (!isOpen || !institutionId) return null;
    return this.institutions().find(i => i.id === institutionId) ?? null;
  });

  readonly formModel = computed(() => {
    const inst = this.institutionForModal();
    if (!inst) return undefined;
    return {
      name:             inst.name,
      type:             inst.type ?? EInstitutionType.UNIVERSITY,
      colorPrimary:     inst.branding.colorPrimary,
      colorSecondary:   inst.branding.colorSecondary || '#1E1B4B',
      logoUrl:          inst.branding.logoUrl ?? '',
      darkMode:         inst.branding.darkMode ?? false,
      description:      inst.metadata?.description ?? '',
      website:          inst.metadata?.website ?? '',
      contactEmail:     inst.metadata?.contactEmail ?? '',
      phoneNumber:      inst.metadata?.phoneNumber ?? '',
      address:          inst.metadata?.address ?? '',
      subscriptionType: inst.metadata?.subscriptionType ?? ESubscriptionType.BASIC,
      maxUsers:         inst.metadata?.maxUsers ?? null
    };
  });

  readonly modalTitle = computed((): string => {
    const { mode } = this._modal();
    const inst = this.institutionForModal();
    switch (mode) {
      case 'create': return 'Nueva Institución';
      case 'edit':   return inst ? `Editar ${inst.name}` : 'Editar Institución';
      case 'view':   return inst?.name ?? 'Detalles de Institución';
      case 'delete': return 'Eliminar Institución';
      default:       return '';
    }
  });

  readonly deleteMessage = computed((): string => {
    const inst = this.institutionForModal();
    return inst
      ? `¿Estás seguro de que deseas eliminar <strong>${inst.name}</strong>? Esta acción eliminará permanentemente la institución y todos los datos asociados.`
      : '¿Estás seguro de que deseas eliminar esta institución?';
  });

  readonly filteredInstitutions = computed(() => {
    const term = this._searchTerm().toLowerCase();
    const insts = this.institutions();
    if (!term) return insts;
    return insts.filter(inst =>
      inst.name.toLowerCase().includes(term) ||
      inst.id.toLowerCase().includes(term)
    );
  });
  //#endregion

  //#region Action subjects
  private readonly load$ = new Subject<{ filters?: IInstitutionFilters; page?: number; limit?: number }>();
  private readonly create$ = new Subject<ICreateInstitutionRequest>();
  private readonly update$ = new Subject<{ id: string; request: IUpdateInstitutionRequest }>();
  private readonly delete$ = new Subject<string>();
  private readonly search$ = new Subject<string>();
  //#endregion

  constructor() {
    this.load$.pipe(
      tap(() => this._isLoading.set(true)),
      switchMap(({ filters, page = 1, limit = 10 }) =>
        this.institutionService.getInstitutions(filters, page, limit).pipe(
          tap(response => {
            this.institutionState.setInstitutions(response.institutions);
            this._pagination.set({ page: response.page, limit: response.limit, total: response.total });
            this._isLoading.set(false);
            this._error.set(null);
            this.updateDashboardMetrics();
          }),
          catchError(error => {
            this._error.set(error.message || 'Error loading institutions');
            this._isLoading.set(false);
            return EMPTY;
          })
        )
      ),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    this.create$.pipe(
      tap(() => this._isCreating.set(true)),
      switchMap(request =>
        this.institutionService.createInstitution(request).pipe(
          tap(institution => {
            this.institutionState.setInstitutions([...this.institutions(), institution]);
            this._isCreating.set(false);
            this._error.set(null);
            this.closeModal();
            this.updateDashboardMetrics();
            this.toastService.success('Institution created successfully');
          }),
          catchError(error => {
            const msg = error.message || 'Error creating institution';
            this._error.set(msg);
            this._isCreating.set(false);
            this.toastService.error(msg);
            return EMPTY;
          })
        )
      ),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    this.update$.pipe(
      tap(() => this._isUpdating.set(true)),
      switchMap(({ id, request }) =>
        this.institutionService.updateInstitution(id, request).pipe(
          tap(institution => {
            this.institutionState.setInstitutions(
              this.institutions().map(inst => (inst.id === id ? institution : inst))
            );
            this._isUpdating.set(false);
            this._error.set(null);
            this.closeModal();
            this.updateDashboardMetrics();
            this.toastService.success('Institution updated successfully');
          }),
          catchError(error => {
            const msg = error.message || 'Error updating institution';
            this._error.set(msg);
            this._isUpdating.set(false);
            this.toastService.error(msg);
            return EMPTY;
          })
        )
      ),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    this.delete$.pipe(
      tap(() => this._isDeleting.set(true)),
      switchMap(id =>
        this.institutionService.deleteInstitution(id).pipe(
          tap(() => {
            this.institutionState.setInstitutions(
              this.institutions().filter(inst => inst.id !== id)
            );
            this._isDeleting.set(false);
            this._error.set(null);
            this.closeModal();
            this.updateDashboardMetrics();
            this.toastService.success('Institution deleted successfully');
          }),
          catchError(error => {
            const msg = error.message || 'Error deleting institution';
            this._error.set(msg);
            this._isDeleting.set(false);
            this.toastService.error(msg);
            return EMPTY;
          })
        )
      ),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    this.search$.pipe(
      tap(term => this._searchTerm.set(term)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }

  //#region Public methods
  load(filters?: IInstitutionFilters, page = 1, limit = 10, refresh = false): void {
    if (refresh) {
      this.institutionState.setInstitutions([]);
    }
    this.load$.next({ filters, page, limit });
  }

  create(request: ICreateInstitutionRequest): void {
    this.create$.next(request);
  }

  update(id: string, request: IUpdateInstitutionRequest): void {
    this.update$.next({ id, request });
  }

  delete(id: string): void {
    this.delete$.next(id);
  }

  search(term: string): void {
    this.search$.next(term);
  }

  selectInstitution(institution: IInstitution | null): void {
    this.institutionState.setSelectedInstitution(institution);
  }

  openModal(mode: TModalMode, institutionId?: string): void {
    this._modal.set({ isOpen: true, mode, institutionId: institutionId ?? null });
    if (institutionId) {
      const institution = this.institutions().find(inst => inst.id === institutionId);
      if (institution) {
        this.selectInstitution(institution);
      }
    }
  }

  closeModal(): void {
    this._modal.set({ isOpen: false, mode: null, institutionId: null });
    this.selectInstitution(null);
  }

  updateDashboardMetrics(): void {
    const institutions = this.institutions();
    const totalInstitutions = institutions.length;
    const totalActiveStudents = institutions.reduce((sum, inst) => sum + inst.usersCount, 0);
    const activeCount = institutions.filter(inst => inst.status === 'active').length;
    const completionRate = totalInstitutions > 0
      ? Math.round((activeCount / totalInstitutions) * 100)
      : 0;
    const peakSystemUsage = Math.min(100, Math.round((totalActiveStudents / 1000) * 100));

    this._dashboardMetrics.set({ totalInstitutions, totalActiveStudents, completionRate, peakSystemUsage });
  }
  //#endregion
}
