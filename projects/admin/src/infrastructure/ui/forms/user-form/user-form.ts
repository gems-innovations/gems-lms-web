import { Component, input, output, signal } from '@angular/core';
import { FormField, email, form, minLength, required } from '@angular/forms/signals';
import { LibInputComponent } from '@gems-lms-web/shared';
import { EUserRole } from 'auth';
import { LucideDynamicIcon, LucideShieldCheck, LucideBookOpen, LucideGraduationCap, type LucideIcon } from '@lucide/angular';

export type TAssignableRole = EUserRole.ADMIN | EUserRole.INSTRUCTOR | EUserRole.STUDENT;

export interface ICreateUserForm {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  role: TAssignableRole;
}

const DEFAULTS: ICreateUserForm = {
  firstName: '',
  lastName: '',
  email: '',
  username: '',
  role: EUserRole.STUDENT
};

@Component({
  selector: 'adm-user-form',
  imports: [FormField, LibInputComponent, LucideDynamicIcon],
  templateUrl: './user-form.html',
  styleUrl: './user-form.scss'
})
export class UserForm {
  readonly isCreating = input<boolean>(false);

  readonly save = output<ICreateUserForm>();
  readonly closed = output<void>();

  readonly allowedRoles: { value: TAssignableRole; label: string; icon: LucideIcon }[] = [
    { value: EUserRole.ADMIN, label: 'Administrador', icon: LucideShieldCheck },
    { value: EUserRole.INSTRUCTOR, label: 'Instructor', icon: LucideBookOpen },
    { value: EUserRole.STUDENT, label: 'Estudiante', icon: LucideGraduationCap }
  ];

  private readonly formModel = signal<ICreateUserForm>({ ...DEFAULTS });

  readonly uform = form(this.formModel, p => {
    required(p.firstName, { message: 'Este campo es obligatorio.' });
    minLength(p.firstName, 2, { message: 'Mínimo 2 caracteres.' });
    required(p.lastName, { message: 'Este campo es obligatorio.' });
    minLength(p.lastName, 2, { message: 'Mínimo 2 caracteres.' });
    required(p.email, { message: 'Este campo es obligatorio.' });
    email(p.email, { message: 'Correo inválido.' });
    required(p.username, { message: 'Este campo es obligatorio.' });
    minLength(p.username, 3, { message: 'Mínimo 3 caracteres.' });
    required(p.role);
  });

  protected setRole(role: TAssignableRole): void {
    this.formModel.update(m => ({ ...m, role }));
  }

  protected submit(): void {
    if (this.uform().valid()) {
      this.save.emit(this.formModel());
      this.formModel.set({ ...DEFAULTS });
    } else {
      this.uform().markAsTouched();
    }
  }

  protected close(): void {
    this.formModel.set({ ...DEFAULTS });
    this.closed.emit();
  }
}
