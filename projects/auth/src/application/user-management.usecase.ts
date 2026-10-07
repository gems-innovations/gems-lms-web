import { computed, inject, Injectable, DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, EMPTY } from 'rxjs';
import { switchMap, mergeMap, tap, catchError } from 'rxjs/operators';
import { ToastService } from 'shared';
import { UserService } from '../infrastructure/services/user.service';
import { IUser, EUserRole } from 'auth/core';

export type TUserModalMode = 'create' | 'delete' | null;

export interface ICreateUserPayload {
  email: string;
  firstName: string;
  lastName: string;
  role: EUserRole.ADMIN | EUserRole.INSTRUCTOR | EUserRole.STUDENT;
  institutionId: string;
  username: string;
}

@Injectable({ providedIn: 'root' })
export class UserManagementUseCase {
  private readonly userService = inject(UserService);
  private readonly toast       = inject(ToastService);
  private readonly destroyRef  = inject(DestroyRef);

  // ── State ────────────────────────────────────────────────────────────────
  private readonly _users      = signal<IUser[]>([]);
  private readonly _isLoading  = signal(false);
  private readonly _isCreating = signal(false);
  private readonly _isDeleting = signal(false);
  private readonly _error      = signal<string | null>(null);
  private readonly _modal      = signal<{ isOpen: boolean; mode: TUserModalMode; userId: string | null }>({
    isOpen: false, mode: null, userId: null
  });

  readonly users      = computed(() => this._users());
  readonly isLoading  = computed(() => this._isLoading());
  readonly isCreating = computed(() => this._isCreating());
  readonly isDeleting = computed(() => this._isDeleting());
  readonly error      = computed(() => this._error());
  readonly modal      = computed(() => this._modal());

  readonly selectedUser = computed(() => {
    const { userId } = this._modal();
    return userId ? this._users().find(u => u.id === userId) ?? null : null;
  });

  // ── Pipelines ────────────────────────────────────────────────────────────
  private readonly load$   = new Subject<string>(); // institutionId
  private readonly create$ = new Subject<ICreateUserPayload>();
  private readonly delete$ = new Subject<string>(); // userId
  private readonly toggle$ = new Subject<string>(); // userId

  constructor() {
    this.load$.pipe(
      tap(() => { this._isLoading.set(true); this._error.set(null); }),
      switchMap(id =>
        this.userService.getInstitutionUsers(id).pipe(
          tap(users => { this._users.set(users); this._isLoading.set(false); }),
          catchError(() => { this._isLoading.set(false); return EMPTY; })
        )
      ),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    // mergeMap (not switchMap): bulk imports emit several payloads in a row and each one must be sent.
    this.create$.pipe(
      tap(() => this._isCreating.set(true)),
      mergeMap(payload =>
        this.userService.createUser({ ...payload, isActive: true }).pipe(
          tap(({ user, temporaryPassword }) => {
            this._users.update(us => [...us, user]);
            this._isCreating.set(false);
            this.closeModal();
            if (temporaryPassword) {
              this.toast.info(`Usuario ${user.email} creado. Contraseña temporal: ${temporaryPassword}`, 15000);
            } else {
              this.toast.success(`Usuario ${user.email} creado`);
            }
          }),
          catchError(err => {
            this._isCreating.set(false);
            const msg = err?.status === 409 ? `Ya existe un usuario con el correo ${payload.email}` : `No se pudo crear ${payload.email}`;
            this._error.set(msg);
            this.toast.error(msg);
            return EMPTY;
          })
        )
      ),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    this.delete$.pipe(
      tap(() => this._isDeleting.set(true)),
      switchMap(id =>
        this.userService.deleteUser(id).pipe(
          tap(() => {
            this._users.update(us => us.filter(u => u.id !== id));
            this._isDeleting.set(false);
            this.closeModal();
          }),
          catchError(error => {
            this._isDeleting.set(false);
            const message = error?.status === 503
              ? 'No se pudieron limpiar los datos de aprendizaje. La cuenta se conserva; reintenta eliminarla.'
              : 'No se pudo eliminar el usuario. Reintenta.';
            this._error.set(message);
            this.toast.error(message);
            return EMPTY;
          })
        )
      ),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    this.toggle$.pipe(
      switchMap(id =>
        this.userService.toggleUserStatus(id).pipe(
          tap(updated => this._users.update(us => us.map(u => u.id === updated.id ? updated : u))),
          catchError(() => { this.toast.error('No se pudo cambiar el estado del usuario. Reintenta.'); return EMPTY; })
        )
      ),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }

  // ── Public API ───────────────────────────────────────────────────────────
  loadUsers(institutionId: string): void { this.load$.next(institutionId); }
  createUser(payload: ICreateUserPayload): void { this.create$.next(payload); }
  deleteUser(userId: string): void { this.delete$.next(userId); }
  toggleStatus(userId: string): void { this.toggle$.next(userId); }

  openModal(mode: TUserModalMode, userId?: string): void {
    this._modal.set({ isOpen: true, mode, userId: userId ?? null });
  }

  closeModal(): void {
    this._modal.set({ isOpen: false, mode: null, userId: null });
  }
}
