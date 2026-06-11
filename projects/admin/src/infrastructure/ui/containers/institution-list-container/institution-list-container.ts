import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { InstitutionList } from '../../components/institution-list/institution-list';
import { DashboardMetricsComponent } from '../../components/dashboard-metrics/dashboard-metrics';
import { InstitutionModalContainer } from '../institution-modal-container/institution-modal-container';
import { LoadingSkeletonComponent } from '../../components/loading-skeleton/loading-skeleton';
import { InstitutionPageHeader } from '../../components/institution-page-header/institution-page-header';
import { InstitutionUseCase } from '../../../../application/institution.usecase';
import { IInstitution } from '../../../../domain/model/institution';

@Component({
  selector: 'adm-institution-list-container',
  imports: [
    InstitutionPageHeader,
    InstitutionList,
    DashboardMetricsComponent,
    LoadingSkeletonComponent,
    InstitutionModalContainer
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './institution-list-container.html'
})
export class InstitutionListContainer implements OnInit {
  private readonly institutionUseCase = inject(InstitutionUseCase);

  readonly institutions = this.institutionUseCase.institutions;
  readonly isLoading = this.institutionUseCase.isLoading;
  readonly error = this.institutionUseCase.error;
  readonly pagination = this.institutionUseCase.pagination;
  readonly dashboardMetrics = this.institutionUseCase.dashboardMetrics;
  readonly searchTerm = this.institutionUseCase.searchTerm;

  ngOnInit(): void {
    this.institutionUseCase.load();
  }

  onCreateNew(): void {
    this.institutionUseCase.openModal('create');
  }

  onEdit(institution: IInstitution): void {
    this.institutionUseCase.openModal('edit', institution.id);
  }

  onView(institution: IInstitution): void {
    this.institutionUseCase.openModal('view', institution.id);
  }

  onDelete(institution: IInstitution): void {
    this.institutionUseCase.openModal('delete', institution.id);
  }

  onPageChange(page: number): void {
    this.institutionUseCase.load(undefined, page);
  }

  onSearch(term: string): void {
    this.institutionUseCase.search(term);
  }
}
