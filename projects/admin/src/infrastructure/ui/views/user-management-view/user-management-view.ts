import { Component, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormControl, Validators, FormGroup } from '@angular/forms';
import { IUser, EUserRole, getRoleLabel } from 'auth';
import * as XLSX from 'xlsx';

export interface ICreateUserForm {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  role: EUserRole.ADMIN | EUserRole.INSTRUCTOR | EUserRole.STUDENT;
}

export interface IBulkImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

@Component({
  selector: 'adm-user-management-view',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './user-management-view.html',
  changeDetection: ChangeDetectionStrategy.Eager,
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

  // ── Outputs (bulk) ───────────────────────────────────────────────────────────
  readonly onBulkImport = output<ICreateUserForm[]>();

  // ── Local state ───────────────────────────────────────────────────────────────
  readonly showCreateForm   = signal(false);
  readonly showImportPanel  = signal(false);
  readonly pendingDeleteId  = signal<string | null>(null);
  readonly importPreview    = signal<ICreateUserForm[]>([]);
  readonly importError      = signal<string | null>(null);

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

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;
    this.importError.set(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data     = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet    = workbook.Sheets[workbook.SheetNames[0]];
        const rows     = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });

        const parsed: ICreateUserForm[] = [];
        for (const row of rows) {
          const firstName = row['firstName'] || row['Nombre'] || '';
          const lastName  = row['lastName']  || row['Apellido'] || '';
          const email     = row['email']     || row['Correo'] || '';
          const username  = row['username']  || row['Usuario'] || email.split('@')[0];
          const rawRole   = (row['role'] || row['Rol'] || 'student').toLowerCase();
          const role      = rawRole === 'admin' ? EUserRole.ADMIN
                          : rawRole === 'instructor' ? EUserRole.INSTRUCTOR
                          : EUserRole.STUDENT;
          if (!firstName || !email) continue;
          parsed.push({ firstName, lastName, email, username, role });
        }

        if (!parsed.length) {
          this.importError.set('El archivo no contiene filas válidas. Verifica que tenga columnas: firstName, lastName, email, username, role');
          return;
        }
        this.importPreview.set(parsed);
      } catch {
        this.importError.set('Error al leer el archivo. Asegúrate de que sea un .xlsx válido.');
      }
    };
    reader.readAsArrayBuffer(file);
    input.value = '';
  }

  confirmImport(): void {
    const rows = this.importPreview();
    if (!rows.length) return;
    this.onBulkImport.emit(rows);
    this.importPreview.set([]);
    this.showImportPanel.set(false);
  }

  cancelImport(): void {
    this.importPreview.set([]);
    this.importError.set(null);
    this.showImportPanel.set(false);
  }
}
