import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CardGridComponent, ConfirmationDialogComponent, ModalBaseComponent, EmptyStateComponent, LibButtonComponent, PageComponent, PageHeaderComponent, SearchBarComponent, StatCardComponent, StatGridComponent, TabsComponent, TabItem, ToolbarComponent } from 'shared';
import { CourseUseCase } from '../../../../application/course.usecase';
import { ICourse, ECourseStatus, EDifficulty } from '../../../../domain/model/course.model';
import { COURSE_TEMPLATES } from '../../../../application/course-templates';
import { DIFFICULTY_LABELS } from '../../utils/course-labels';
import { CourseCard } from '../../components/course-card/course-card';
import { SkeletonComponent } from 'shared/loading';

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
    SkeletonComponent,
    EmptyStateComponent,
    ConfirmationDialogComponent,
    ModalBaseComponent,
    CourseCard
  ],
  templateUrl: './course-list-container.html',
  styleUrl: './course-list-container.scss'
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

  readonly activeTab  = signal<string>(ALL_TAB);
  readonly searchTerm = signal<string>('');

  // ── Diálogo «Nuevo curso» ──
  protected readonly templates = COURSE_TEMPLATES;
  protected readonly difficulties = Object.values(EDifficulty).map(v => ({ value: v, label: DIFFICULTY_LABELS[v] }));
  protected readonly newTitle = signal('');
  protected readonly newDescription = signal('');
  protected readonly newDifficulty = signal<EDifficulty>(EDifficulty.BEGINNER);
  protected readonly newTemplate = signal('');
  protected readonly canCreate = computed(() => this.newTitle().trim().length >= 3 && this.newDescription().trim().length > 0);

  protected pickTemplate(id: string): void {
    this.newTemplate.set(id);
    const t = COURSE_TEMPLATES.find(x => x.id === id);
    if (!t) return;
    if (!this.newTitle().trim()) this.newTitle.set(t.title);
    if (!this.newDescription().trim()) this.newDescription.set(t.summary);
    this.newDifficulty.set(t.difficulty);
  }

  protected submitCreate(): void {
    if (!this.canCreate() || this.uc.isSaving()) return;
    const t = COURSE_TEMPLATES.find(x => x.id === this.newTemplate());
    this.uc.create({ title: this.newTitle().trim(), description: this.newDescription().trim(), difficulty: this.newDifficulty(), tags: t?.tags ?? [], templateId: t?.id });
  }

  protected closeCreate(): void {
    this.uc.closeModal();
    this.newTitle.set(''); this.newDescription.set(''); this.newTemplate.set(''); this.newDifficulty.set(EDifficulty.BEGINNER);
  }

  ngOnInit(): void { this.uc.load(); }

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
