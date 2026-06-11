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
import { CourseUseCase } from '../../../../application/course.usecase';
import { ICourse, ECourseStatus } from '../../../../domain/model/course.model';
import { CourseCard } from '../../components/course-card/course-card';

const ALL_TAB = 'all';

@Component({
  selector: 'edu-course-list-container',
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
    CourseCard
  ],
  templateUrl: './course-list-container.html'
})
export class CourseListContainer implements OnInit {
  private readonly router = inject(Router);
  readonly uc = inject(CourseUseCase);

  readonly statusTabs: TabItem[] = [
    { id: ALL_TAB, label: 'Todos' },
    { id: ECourseStatus.PUBLISHED, label: 'Publicados' },
    { id: ECourseStatus.DRAFT, label: 'Borradores' },
    { id: ECourseStatus.ARCHIVED, label: 'Archivados' }
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
    this.uc.setStatusFilter(tabId === ALL_TAB ? null : (tabId as ECourseStatus));
  }

  openEditor(course: ICourse): void {
    this.router.navigate(['/education/courses', course.id, 'edit']);
  }

  createCourse(): void {
    this.uc.openModal('create');
  }

  confirmDelete(): void {
    const id = this.uc.modal().courseId;
    if (id) this.uc.delete(id);
  }
}
