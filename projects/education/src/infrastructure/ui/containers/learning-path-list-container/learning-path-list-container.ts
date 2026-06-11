import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  CardGridComponent,
  ConfirmationDialogComponent,
  EmptyStateComponent,
  LibButtonComponent,
  LoadingSkeletonComponent,
  PageComponent,
  PageHeaderComponent,
  SearchBarComponent,
  StatCardComponent,
  StatGridComponent,
  TabsComponent,
  TabItem,
  ToolbarComponent
} from 'shared';
import { LearningPathUseCase } from '../../../../application/learning-path.usecase';
import { ILearningPath, ELearningPathStatus } from '../../../../domain/model/learning-path.model';
import { PathCard } from '../../components/path-card/path-card';

const ALL_TAB = 'all';

@Component({
  selector: 'edu-learning-path-list-container',
  imports: [
    PageComponent,
    PageHeaderComponent,
    LibButtonComponent,
    StatGridComponent,
    StatCardComponent,
    ToolbarComponent,
    SearchBarComponent,
    TabsComponent,
    CardGridComponent,
    LoadingSkeletonComponent,
    EmptyStateComponent,
    ConfirmationDialogComponent,
    PathCard
  ],
  templateUrl: './learning-path-list-container.html'
})
export class LearningPathListContainer implements OnInit {
  private readonly router = inject(Router);
  readonly uc = inject(LearningPathUseCase);

  readonly statusTabs: TabItem[] = [
    { id: ALL_TAB, label: 'Todas' },
    { id: ELearningPathStatus.PUBLISHED, label: 'Publicadas' },
    { id: ELearningPathStatus.DRAFT, label: 'Borradores' }
  ];

  readonly activeTab = signal<string>(ALL_TAB);
  readonly searchTerm = signal<string>('');

  readonly showDeleteDialog = computed(() => {
    const modal = this.uc.modal();
    return modal.isOpen && modal.mode === 'delete';
  });

  ngOnInit(): void {
    this.uc.load();
  }

  onSearch(term: string): void {
    this.searchTerm.set(term);
    this.uc.setSearch(term);
  }

  onTabChange(tabId: string): void {
    this.activeTab.set(tabId);
    this.uc.setStatusFilter(tabId === ALL_TAB ? null : (tabId as ELearningPathStatus));
  }

  createPath(): void {
    this.uc.openModal('create');
  }

  openEditor(path: ILearningPath): void {
    this.router.navigate(['/education/learning-paths', path.id, 'edit']);
  }

  confirmDelete(): void {
    const id = this.uc.modal().lpId;
    if (id) this.uc.delete(id);
  }
}
