import { Component, input, output } from '@angular/core';
import { IUser, EUserRole, getRoleLabel } from 'auth';

@Component({
  selector: 'adm-user-list',
  templateUrl: './user-list.html',
  styleUrl: './user-list.scss'
})
export class UserList {
  readonly users = input<IUser[]>([]);

  readonly toggleStatus = output<string>();
  readonly deleteUser = output<string>();

  protected readonly getRoleLabel = getRoleLabel;

  protected readonly roleClasses: Record<EUserRole, string> = {
    [EUserRole.SUPER_ADMIN]: 'role--super',
    [EUserRole.ADMIN]: 'role--admin',
    [EUserRole.INSTRUCTOR]: 'role--instructor',
    [EUserRole.STUDENT]: 'role--student'
  };

  protected getInitials(user: IUser): string {
    return `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();
  }
}
