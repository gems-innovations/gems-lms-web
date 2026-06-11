import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { InstitutionForm } from '../../forms/institution-form/institution-form';
import { InstitutionUseCase } from '../../../../application/institution.usecase';
import { ICreateInstitutionRequest } from '../../../../domain/model/institution';

@Component({
  selector: 'adm-institution-form-container',
  imports: [InstitutionForm],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './institution-form-container.html'
})
export class InstitutionFormContainer {
  private readonly institutionUseCase = inject(InstitutionUseCase);
  private readonly router = inject(Router);

  public readonly isCreating = this.institutionUseCase.isCreating;
  public readonly error = this.institutionUseCase.error;

  onSubmit(request: ICreateInstitutionRequest) {
    this.institutionUseCase.create(request);
  }

  onCancel() {
    this.router.navigate(['/admin/institutions']);
  }
}
