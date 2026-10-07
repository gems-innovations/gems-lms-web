import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  ConfirmationDialogComponent,
  EmptyStateComponent,
  LibButtonComponent,
  LoadingSkeletonComponent,
  ModalBaseComponent,
  PaginationComponent,
  SearchBarComponent,
} from 'shared';
import { AdminUserManagementUseCase, ICreateUserForm } from '../../../../application/admin-user-management.usecase';
import { UserForm } from '../../forms/user-form/user-form';
import { UserImportPanel } from '../../components/user-import-panel/user-import-panel';
import { UserStatsChips } from '../../components/user-stats-chips/user-stats-chips';
import { UserList } from '../../components/user-list/user-list';

@Component({
  selector: 'adm-user-management-container',
  imports: [
    LibButtonComponent,
    LoadingSkeletonComponent,
    EmptyStateComponent,
    ConfirmationDialogComponent,
    ModalBaseComponent,
    UserForm,
    UserImportPanel,
    UserStatsChips,
    UserList,
    SearchBarComponent,
    PaginationComponent
  ],
  templateUrl: './user-management-container.html',
  styleUrl: './user-management-container.scss',
})
export class UserManagementContainer implements OnInit {
  protected readonly uc = inject(AdminUserManagementUseCase);

  private static readonly PAGE_SIZE = 20;

  protected readonly search = signal('');
  protected readonly page   = signal(1);

  /** Users matching the search by name, username or e-mail. */
  protected readonly filteredUsers = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.uc.users();
    return this.uc.users().filter(u =>
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.username ?? '').toLowerCase().includes(q));
  });

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredUsers().length / UserManagementContainer.PAGE_SIZE)));

  protected readonly pagedUsers = computed(() => {
    const page = Math.min(this.page(), this.totalPages());
    const start = (page - 1) * UserManagementContainer.PAGE_SIZE;
    return this.filteredUsers().slice(start, start + UserManagementContainer.PAGE_SIZE);
  });

  ngOnInit(): void { this.uc.load(); }

  protected onSearch(term: string): void { this.search.set(term); this.page.set(1); }

  protected createUser(form: ICreateUserForm): void  { this.uc.createUser(form); }
  protected bulkImport(forms: ICreateUserForm[]): void { this.uc.bulkCreate(forms); }
  protected toggleStatus(userId: string): void       { this.uc.toggleStatus(userId); }
  protected executeDelete(): void                    { this.uc.executeDelete(); }
}
