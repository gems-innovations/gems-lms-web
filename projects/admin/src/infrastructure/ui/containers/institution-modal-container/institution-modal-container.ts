import { Component, inject, computed, signal, viewChild, effect, untracked, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserService, EUserRole } from 'auth';
import { ModalBaseComponent, LibButtonComponent, ConfirmationDialogComponent } from 'shared';
import { InstitutionForm } from '../../forms/institution-form/institution-form';
import { InstitutionDetailsComponent } from '../../components/institution-details/institution-details';
import { InstitutionUseCase } from '../../../../application/institution.usecase';
import type { ICreateInstitutionRequest, IUpdateInstitutionRequest } from '../../../../domain/model/institution.model';

@Component({
  selector: 'adm-institution-modal-container',
  standalone: true,
  imports: [
    FormsModule,
    ModalBaseComponent,
    LibButtonComponent,
    ConfirmationDialogComponent,
    InstitutionForm,
    InstitutionDetailsComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './institution-modal-container.html'
})
export class InstitutionModalContainer {
  private readonly institutionForm = viewChild(InstitutionForm);

  protected readonly uc = inject(InstitutionUseCase);

  readonly isFormBusy = computed(() => this.uc.isCreating() || this.uc.isUpdating());

  constructor() {
    effect(() => {
      if (!this.uc.modal().isOpen) {
        untracked(() => this.institutionForm()?.resetForm());
      }
    });
  }

  // ── Crear administrador de la institución (solo super admin) ──────────────
  private readonly users = inject(UserService);
  protected readonly adminOpen = signal(false);
  protected readonly adminBusy = signal(false);
  protected readonly adminError = signal('');
  protected readonly adminResult = signal<{ email: string; password: string } | null>(null);
  protected adminForm = { firstName: '', lastName: '', email: '' };

  protected openAdmin(): void {
    this.adminForm = { firstName: '', lastName: '', email: '' };
    this.adminError.set('');
    this.adminResult.set(null);
    this.adminOpen.set(true);
  }

  protected closeAdmin(): void {
    if (!this.adminBusy()) this.adminOpen.set(false);
  }

  protected createAdmin(): void {
    const inst = this.uc.institutionForModal();
    const f = this.adminForm;
    if (!inst || !f.firstName.trim() || !f.lastName.trim() || !f.email.trim()) {
      this.adminError.set('Completa nombre, apellido y correo.');
      return;
    }
    this.adminBusy.set(true);
    this.adminError.set('');
    this.users.createUser({
      firstName: f.firstName.trim(), lastName: f.lastName.trim(), email: f.email.trim(),
      username: '', role: EUserRole.ADMIN, institutionId: inst.id, isActive: true
    }).subscribe({
      next: r => {
        this.adminBusy.set(false);
        this.adminResult.set({ email: r.user.email, password: r.temporaryPassword ?? '(la que escribiste)' });
      },
      error: e => {
        this.adminBusy.set(false);
        this.adminError.set(e?.error?.message ?? 'No se pudo crear el administrador.');
      }
    });
  }

  protected close(): void {
    if (!this.isFormBusy() && !this.uc.isDeleting()) this.uc.closeModal();
  }

  protected onCreateSubmit(request: ICreateInstitutionRequest): void { this.uc.create(request); }

  protected onEditSubmit(request: IUpdateInstitutionRequest): void {
    const inst = this.uc.institutionForModal();
    if (inst) this.uc.update(inst.id, request);
  }

  protected onEditFromView(): void {
    const inst = this.uc.institutionForModal();
    if (inst) this.uc.openModal('edit', inst.id);
  }

  protected onConfirmDelete(): void {
    const inst = this.uc.institutionForModal();
    if (inst) this.uc.delete(inst.id);
  }
}
