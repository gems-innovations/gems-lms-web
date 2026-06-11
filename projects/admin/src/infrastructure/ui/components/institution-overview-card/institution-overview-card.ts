import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe, UpperCasePipe } from '@angular/common';
import { IInstitution, EInstitutionStatus } from '../../../../domain/model/institution';

@Component({
  selector: 'adm-institution-overview-card',
  imports: [RouterLink, DecimalPipe, UpperCasePipe],
  templateUrl: './institution-overview-card.html',
  styleUrl: './institution-overview-card.scss'
})
export class InstitutionOverviewCard {
  readonly institution = input.required<IInstitution>();

  readonly edit = output<void>();

  protected readonly EInstitutionStatus = EInstitutionStatus;

  protected getStatusLabel(status: EInstitutionStatus): string {
    const labels: Record<EInstitutionStatus, string> = {
      [EInstitutionStatus.ACTIVE]: 'Activa',
      [EInstitutionStatus.SUSPENDED]: 'Suspendida',
      [EInstitutionStatus.PENDING]: 'Pendiente'
    };
    return labels[status] ?? status;
  }
}
