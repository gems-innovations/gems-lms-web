import { Component, OnInit, inject } from '@angular/core';
import {
  ConfirmationDialogComponent,
  EmptyStateComponent,
  LibButtonComponent,
  LoadingSkeletonComponent,
  PageComponent,
  PageHeaderComponent
} from 'shared';
import { AdminUserManagementUseCase, ICreateUserForm } from '../../../../application/admin-user-management.usecase';
import { UserForm } from '../../forms/user-form/user-form';
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
  protected readonly uc = inject(AdminUserManagementUseCase);

  ngOnInit(): void { this.uc.load(); }

  protected createUser(form: ICreateUserForm): void  { this.uc.createUser(form); }
  protected bulkImport(forms: ICreateUserForm[]): void { this.uc.bulkCreate(forms); }
  protected toggleStatus(userId: string): void       { this.uc.toggleStatus(userId); }
  protected executeDelete(): void                    { this.uc.executeDelete(); }
}
