import { Component, input, output, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, Validators, FormGroup } from '@angular/forms';
import { IUser, EUserRole, getRoleLabel } from 'auth';

export interface ICreateUserForm {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  role: EUserRole.ADMIN | EUserRole.INSTRUCTOR | EUserRole.STUDENT;
}

@Component({
  selector: 'adm-user-management-view',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './user-management-view.html',
  styleUrl: './user-management-view.scss'
})
export class UserManagementView {
  // ── Inputs ───────────────────────────────────────────────────────────────────
  readonly users      = input<IUser[]>([]);
  readonly isLoading  = input<boolean>(false);
  readonly isCreating = input<boolean>(false);
  readonly isDeleting = input<boolean>(false);
  readonly selectedUser = input<IUser | null>(null);

  // ── Outputs ──────────────────────────────────────────────────────────────────
  readonly onCreateUser  = output<ICreateUserForm>();
  readonly onDeleteUser  = output<string>();
  readonly onToggleStatus = output<string>();
  readonly onConfirmDelete = output<string>();

  // ── Local state ───────────────────────────────────────────────────────────────
  readonly showCreateForm   = signal(false);
  readonly pendingDeleteId  = signal<string | null>(null);

  readonly EUserRole   = EUserRole;
  readonly getRoleLabel = getRoleLabel;

  readonly allowedRoles: { value: EUserRole; label: string; icon: string }[] = [
    { value: EUserRole.ADMIN,      label: 'Administrador', icon: '🛡️' },
    { value: EUserRole.INSTRUCTOR, label: 'Instructor',    icon: '📖' },
    { value: EUserRole.STUDENT,    label: 'Estudiante',    icon: '🎓' }
  ];

  readonly roleColors: Record<EUserRole, string> = {
    [EUserRole.SUPER_ADMIN]: 'role--super',
    [EUserRole.ADMIN]:       'role--admin',
    [EUserRole.INSTRUCTOR]:  'role--instructor',
    [EUserRole.STUDENT]:     'role--student'
  };

  // ── Create form ───────────────────────────────────────────────────────────────
  readonly createForm = new FormGroup({
    firstName: new FormControl('', [Validators.required, Validators.minLength(2)]),
    lastName:  new FormControl('', [Validators.required, Validators.minLength(2)]),
    email:     new FormControl('', [Validators.required, Validators.email]),
    username:  new FormControl('', [Validators.required, Validators.minLength(3)]),
    role:      new FormControl<EUserRole.ADMIN | EUserRole.INSTRUCTOR | EUserRole.STUDENT>(
                 EUserRole.STUDENT, [Validators.required])
  });

  submitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    const v = this.createForm.value;
    this.onCreateUser.emit({
      firstName: v.firstName!,
      lastName:  v.lastName!,
      email:     v.email!,
      username:  v.username!,
      role:      v.role!
    });
    this.createForm.reset({ role: EUserRole.STUDENT });
    this.showCreateForm.set(false);
  }

  confirmDelete(userId: string): void { this.pendingDeleteId.set(userId); }
  cancelDelete(): void { this.pendingDeleteId.set(null); }
  executeDelete(): void {
    const id = this.pendingDeleteId();
    if (id) { this.onDeleteUser.emit(id); this.pendingDeleteId.set(null); }
  }

  isInvalid(field: string): boolean {
    const ctrl = this.createForm.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  getInitials(user: IUser): string {
    return `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();
  }

  countByRole(role: EUserRole): number {
    return this.users().filter(u => u.role === role).length;
  }
}
