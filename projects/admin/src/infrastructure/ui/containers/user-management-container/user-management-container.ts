import { Component, OnInit, inject, signal } from '@angular/core';
import { AuthSessionService, UserManagementUseCase, ICreateUserPayload } from 'auth';
import {
  ConfirmationDialogComponent,
  EmptyStateComponent,
  LibButtonComponent,
  LoadingSkeletonComponent,
  PageComponent,
  PageHeaderComponent
} from 'shared';
import { UserForm, ICreateUserForm } from '../../forms/user-form/user-form';
import { UserImportPanel } from '../../components/user-import-panel/user-import-panel';
import { UserStatsChips } from '../../components/user-stats-chips/user-stats-chips';
import { UserList } from '../../components/user-list/user-list';

@Component({
  selector: 'adm-user-management-container',
  imports: [
    PageComponent,
    PageHeaderComponent,
    LibButtonComponent,
    LoadingSkeletonComponent,
    EmptyStateComponent,
    ConfirmationDialogComponent,
    UserForm,
    UserImportPanel,
    UserStatsChips,
    UserList
  ],
  templateUrl: './user-management-container.html'
})
export class UserManagementContainer implements OnInit {
  private readonly authSession = inject(AuthSessionService);
  private readonly uc = inject(UserManagementUseCase);

  readonly users = this.uc.users;
  readonly isLoading = this.uc.isLoading;
  readonly isCreating = this.uc.isCreating;
  readonly isDeleting = this.uc.isDeleting;

  readonly showCreateForm = signal(false);
  readonly showImportPanel = signal(false);
  readonly pendingDeleteId = signal<string | null>(null);

  ngOnInit(): void {
    const institutionId = this.authSession.institutionId();
    if (institutionId) {
      this.uc.loadUsers(institutionId);
    }
  }

  createUser(form: ICreateUserForm): void {
    const institutionId = this.authSession.institutionId();
    if (!institutionId) return;
    const payload: ICreateUserPayload = { ...form, institutionId };
    this.uc.createUser(payload);
    this.showCreateForm.set(false);
  }

  bulkImport(forms: ICreateUserForm[]): void {
    const institutionId = this.authSession.institutionId();
    if (!institutionId) return;
    for (const form of forms) {
      this.uc.createUser({ ...form, institutionId });
    }
    this.showImportPanel.set(false);
  }

  toggleStatus(userId: string): void {
    this.uc.toggleStatus(userId);
  }

  executeDelete(): void {
    const id = this.pendingDeleteId();
    if (id) {
      this.uc.deleteUser(id);
      this.pendingDeleteId.set(null);
    }
  }
}
