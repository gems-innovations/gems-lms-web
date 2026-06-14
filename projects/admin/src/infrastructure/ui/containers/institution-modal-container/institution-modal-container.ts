import { Component, inject, computed, ViewChild, effect, ChangeDetectionStrategy } from '@angular/core';
import { ModalBaseComponent, LibButtonComponent, ConfirmationDialogComponent } from 'shared';
import { InstitutionForm } from '../../forms/institution-form/institution-form';
import { InstitutionDetailsComponent } from '../../components/institution-details/institution-details';
import { InstitutionUseCase } from '../../../../application/institution.usecase';
import type { ICreateInstitutionRequest, IUpdateInstitutionRequest } from '../../../../domain/model/institution.model';

@Component({
  selector: 'adm-institution-modal-container',
  standalone: true,
  imports: [
    ModalBaseComponent,
    LibButtonComponent,
    ConfirmationDialogComponent,
    InstitutionForm,
    InstitutionDetailsComponent
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './institution-modal-container.html'
})
export class InstitutionModalContainer {
  @ViewChild(InstitutionForm) private institutionForm?: InstitutionForm;

  protected readonly uc = inject(InstitutionUseCase);

  readonly isFormBusy = computed(() => this.uc.isCreating() || this.uc.isUpdating());

  constructor() {
    effect(() => {
      if (!this.uc.modal().isOpen) {
        this.institutionForm?.resetForm();
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
