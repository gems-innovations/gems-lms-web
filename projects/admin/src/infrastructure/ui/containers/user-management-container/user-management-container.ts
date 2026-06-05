import { Component, inject, OnInit } from '@angular/core';
import { AuthSessionService, UserManagementUseCase, ICreateUserPayload } from 'auth';
import { UserManagementView, ICreateUserForm } from '../../views/user-management-view/user-management-view';

@Component({
  selector: 'adm-user-management-container',
  imports: [UserManagementView],
  templateUrl: './user-management-container.html'
})
export class UserManagementContainer implements OnInit {
  private readonly authSession = inject(AuthSessionService);
  private readonly uc          = inject(UserManagementUseCase);

  readonly users      = this.uc.users;
  readonly isLoading  = this.uc.isLoading;
  readonly isCreating = this.uc.isCreating;
  readonly isDeleting = this.uc.isDeleting;
  readonly selectedUser = this.uc.selectedUser;

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
  }

  deleteUser(userId: string): void {
    this.uc.deleteUser(userId);
  }

  toggleStatus(userId: string): void {
    this.uc.toggleStatus(userId);
  }
}
