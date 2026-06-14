import { Component, inject, OnInit } from '@angular/core';
import { LibButtonComponent, PageComponent, PageHeaderComponent } from 'shared';
import { InstitutionList } from '../../components/institution-list/institution-list';
import { DashboardMetricsComponent } from '../../components/dashboard-metrics/dashboard-metrics';
import { InstitutionModalContainer } from '../institution-modal-container/institution-modal-container';
import { InstitutionUseCase } from '../../../../application/institution.usecase';
import { IInstitution } from '../../../../domain/model/institution.model';

@Component({
  selector: 'adm-institution-list-container',
  imports: [
    PageComponent,
    PageHeaderComponent,
    LibButtonComponent,
    InstitutionList,
    DashboardMetricsComponent,
    InstitutionModalContainer
  ],
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

  reload(): void {
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
