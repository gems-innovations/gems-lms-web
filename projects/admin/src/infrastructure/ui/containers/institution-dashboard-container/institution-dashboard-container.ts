import { Component, OnInit, inject } from '@angular/core';
import { EmptyStateComponent, LibButtonComponent, LoadingSkeletonComponent, PageComponent, PageHeaderComponent } from 'shared';
import { InstitutionUseCase } from '../../../../application/institution.usecase';
import { InstitutionModalContainer } from '../institution-modal-container/institution-modal-container';
import { InstitutionOverviewCard } from '../../components/institution-overview-card/institution-overview-card';
import { InstitutionBrandingPanel } from '../../components/institution-branding-panel/institution-branding-panel';

@Component({
  selector: 'adm-institution-dashboard-container',
  imports: [
    PageComponent,
    PageHeaderComponent,
    LibButtonComponent,
    LoadingSkeletonComponent,
    EmptyStateComponent,
    InstitutionModalContainer,
    InstitutionOverviewCard,
    InstitutionBrandingPanel
  ],
  templateUrl: './institution-dashboard-container.html'
})
export class InstitutionDashboardContainer implements OnInit {
  protected readonly uc = inject(InstitutionUseCase);

  ngOnInit(): void { this.uc.load(); }

  protected editInstitution(): void {
    const inst = this.uc.currentInstitution();
    if (inst) this.uc.openModal('edit', inst.id);
  }
}
