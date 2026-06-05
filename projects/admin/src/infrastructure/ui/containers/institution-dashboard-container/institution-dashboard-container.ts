import { Component, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe, UpperCasePipe } from '@angular/common';
import { AuthSessionService } from 'auth';
import { InstitutionUseCase } from '../../../../application/institution.usecase';
import { InstitutionModalContainer } from '../institution-modal-container/institution-modal-container';
import { EInstitutionStatus } from '../../../../domain/model/institution';

@Component({
  selector: 'adm-institution-dashboard-container',
  imports: [RouterLink, DecimalPipe, UpperCasePipe, InstitutionModalContainer],
  templateUrl: './institution-dashboard-container.html',
  styleUrl: './institution-dashboard-container.scss'
})
export class InstitutionDashboardContainer implements OnInit {
  private readonly authSession = inject(AuthSessionService);
  private readonly uc          = inject(InstitutionUseCase);

  readonly user          = this.authSession.user;
  readonly institutionId = this.authSession.institutionId;
  readonly isLoading     = this.uc.isLoading;

  readonly institution = computed(() => {
    const id = this.institutionId();
    if (!id) return null;
    return this.uc.institutions().find(i => i.id === id) ?? null;
  });

  readonly EInstitutionStatus = EInstitutionStatus;

  ngOnInit(): void {
    this.uc.load();
  }

  editInstitution(): void {
    const inst = this.institution();
    if (inst) this.uc.openModal('edit', inst.id);
  }

  getStatusLabel(status: EInstitutionStatus): string {
    const labels: Record<EInstitutionStatus, string> = {
      [EInstitutionStatus.ACTIVE]:    'Activa',
      [EInstitutionStatus.SUSPENDED]: 'Suspendida',
      [EInstitutionStatus.PENDING]:   'Pendiente'
    };
    return labels[status] ?? status;
  }
}
