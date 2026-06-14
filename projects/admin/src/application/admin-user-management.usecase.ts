import { inject, Injectable, signal } from '@angular/core';
import { AuthSessionService, UserManagementUseCase, ICreateUserPayload, EUserRole } from 'auth';

export interface ICreateUserForm {
  email: string;
  firstName: string;
  lastName: string;
  role: EUserRole.ADMIN | EUserRole.INSTRUCTOR | EUserRole.STUDENT;
  username: string;
}

@Injectable({ providedIn: 'root' })
export class AdminUserManagementUseCase {
  private readonly authSession = inject(AuthSessionService);
  private readonly uc          = inject(UserManagementUseCase);

  readonly users      = this.uc.users;
  readonly isLoading  = this.uc.isLoading;
  readonly isCreating = this.uc.isCreating;
  readonly isDeleting = this.uc.isDeleting;

  readonly showCreateForm  = signal(false);
  readonly showImportPanel = signal(false);
  readonly pendingDeleteId = signal<string | null>(null);

  load(): void {
    const institutionId = this.authSession.institutionId();
    if (institutionId) this.uc.loadUsers(institutionId);
  }

  createUser(form: ICreateUserForm): void {
    const institutionId = this.authSession.institutionId();
    if (!institutionId) return;
    const payload: ICreateUserPayload = { ...form, institutionId };
    this.uc.createUser(payload);
    this.showCreateForm.set(false);
  }

  bulkCreate(forms: ICreateUserForm[]): void {
    const institutionId = this.authSession.institutionId();
    if (!institutionId) return;
    for (const form of forms) {
      this.uc.createUser({ ...form, institutionId });
    }
    this.showImportPanel.set(false);
  }

  toggleStatus(userId: string): void { this.uc.toggleStatus(userId); }

  requestDelete(id: string): void  { this.pendingDeleteId.set(id); }
  cancelDelete():  void             { this.pendingDeleteId.set(null); }

  executeDelete(): void {
    const id = this.pendingDeleteId();
    if (id) {
      this.uc.deleteUser(id);
      this.pendingDeleteId.set(null);
    }
  }
}
