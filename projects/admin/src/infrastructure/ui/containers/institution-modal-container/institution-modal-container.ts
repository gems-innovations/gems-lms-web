import { Component, inject, computed, ViewChild, effect, ChangeDetectionStrategy } from '@angular/core';
import { ModalBaseComponent, LibButtonComponent, ConfirmationDialogComponent, BrandingService } from 'shared';
import { InstitutionForm } from '../../forms/institution-form/institution-form';
import { InstitutionDetailsViewComponent } from '../../components/institution-details-view/institution-details-view';
import { InstitutionUseCase } from '../../../../application/institution.usecase';
import type { ICreateInstitutionRequest, IUpdateInstitutionRequest } from '../../../../domain/model/institution';
import { EInstitutionType, ESubscriptionType } from '../../../../domain/model/institution';

@Component({
  selector: 'adm-institution-modal-container',
  standalone: true,
  imports: [
    ModalBaseComponent,
    LibButtonComponent,
    ConfirmationDialogComponent,
    InstitutionForm,
    InstitutionDetailsViewComponent
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './institution-modal-container.html'
})
export class InstitutionModalContainer {
  private readonly useCase = inject(InstitutionUseCase);
  private readonly brandingService = inject(BrandingService);

  @ViewChild(InstitutionForm) private institutionForm?: InstitutionForm;

  readonly modal = this.useCase.modal;
  readonly isCreating = this.useCase.isCreating;
  readonly isUpdating = this.useCase.isUpdating;
  readonly isDeleting = this.useCase.isDeleting;
  readonly institutions = this.useCase.institutions;

  readonly isFormBusy = computed(() => this.isCreating() || this.isUpdating());

  readonly institutionForModal = computed(() => {
    const { isOpen, institutionId } = this.modal();
    if (!isOpen || !institutionId) return null;
    return this.institutions().find(i => i.id === institutionId) ?? null;
  });

  readonly formModel = computed(() => {
    const inst = this.institutionForModal();
    if (!inst) return undefined;
    return {
      name: inst.name,
      type: inst.type ?? EInstitutionType.UNIVERSITY,
      colorPrimary: inst.branding.colorPrimary,
      colorSecondary: inst.branding.colorSecondary || '#1E1B4B',
      logoUrl: inst.branding.logoUrl ?? '',
      darkMode: inst.branding.darkMode ?? false,
      description: inst.metadata?.description ?? '',
      website: inst.metadata?.website ?? '',
      contactEmail: inst.metadata?.contactEmail ?? '',
      phoneNumber: inst.metadata?.phoneNumber ?? '',
      address: inst.metadata?.address ?? '',
      subscriptionType: inst.metadata?.subscriptionType ?? ESubscriptionType.BASIC,
      maxUsers: inst.metadata?.maxUsers ?? null
    };
  });

  readonly modalTitle = computed(() => {
    const { mode } = this.modal();
    const inst = this.institutionForModal();
    switch (mode) {
      case 'create': return 'Nueva Institución';
      case 'edit': return inst ? `Editar ${inst.name}` : 'Editar Institución';
      case 'view': return inst?.name ?? 'Detalles de Institución';
      case 'delete': return 'Eliminar Institución';
      default: return '';
    }
  });

  readonly deleteMessage = computed(() => {
    const inst = this.institutionForModal();
    return inst
      ? `¿Estás seguro de que deseas eliminar <strong>${inst.name}</strong>? Esta acción eliminará permanentemente la institución y todos los datos asociados.`
      : '¿Estás seguro de que deseas eliminar esta institución?';
  });

  constructor() {
    effect(() => {
      const { isOpen, mode } = this.modal();
      if (!isOpen) {
        this.institutionForm?.resetForm();
        this.brandingService.reset();
        return;
      }
      // When viewing an institution, apply its branding so the admin sees
      // a live preview of how the platform will look for that institution.
      if (mode === 'view') {
        const inst = this.institutionForModal();
        if (inst) {
          this.brandingService.apply({
            colorPrimary: inst.branding.colorPrimary,
            colorSecondary: inst.branding.colorSecondary,
            logoUrl: inst.branding.logoUrl,
            darkMode: inst.branding.darkMode
          });
        }
      } else {
        // For create / edit / delete, reset to default branding
        this.brandingService.reset();
      }
    });
  }

  close(): void {
    if (!this.isFormBusy() && !this.isDeleting()) {
      this.useCase.closeModal();
    }
  }

  onCreateSubmit(request: ICreateInstitutionRequest): void {
    this.useCase.create(request);
  }

  onEditSubmit(request: IUpdateInstitutionRequest): void {
    const inst = this.institutionForModal();
    if (inst) {
      this.useCase.update(inst.id, request);
    }
  }

  onEditFromView(): void {
    const inst = this.institutionForModal();
    if (inst) {
      this.useCase.openModal('edit', inst.id);
    }
  }

  onConfirmDelete(): void {
    const inst = this.institutionForModal();
    if (inst) {
      this.useCase.delete(inst.id);
    }
  }
}
