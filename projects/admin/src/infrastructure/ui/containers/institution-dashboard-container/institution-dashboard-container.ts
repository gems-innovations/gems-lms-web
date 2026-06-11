import { Component, OnInit, computed, inject } from '@angular/core';
import { AuthSessionService } from 'auth';
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
  private readonly authSession = inject(AuthSessionService);
  private readonly uc = inject(InstitutionUseCase);

  readonly institutionId = this.authSession.institutionId;
  readonly isLoading = this.uc.isLoading;

  readonly institution = computed(() => {
    const id = this.institutionId();
    if (!id) return null;
    return this.uc.institutions().find(i => i.id === id) ?? null;
  });

  ngOnInit(): void {
    this.uc.load();
  }

  editInstitution(): void {
    const inst = this.institution();
    if (inst) this.uc.openModal('edit', inst.id);
  }
}
