import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CourseUseCase } from '../../../../application/course.usecase';
import {
  ICourse,
  ICourseModule,
  ILesson,
  IContentBlock,
  ECourseStatus,
  EDifficulty,
  EContentType,
  ICreateContentBlockRequest
} from '../../../../domain/model/course.model';
import { ContentBlockModalContainer } from '../content-block-modal-container/content-block-modal-container';

type TEditorPanel = 'course' | 'module' | 'lesson' | 'block';

interface ISelectedItem {
  type: TEditorPanel;
  moduleId?: string;
  lessonId?: string;
  blockId?: string;
}

@Component({
  selector: 'edu-course-editor-container',
  standalone: true,
  imports: [CommonModule, FormsModule, ContentBlockModalContainer],
  templateUrl: './course-editor-container.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './course-editor-container.scss'
})
export class CourseEditorContainer implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly uc = inject(CourseUseCase);

  readonly ECourseStatus = ECourseStatus;
  readonly EDifficulty = EDifficulty;
  readonly EContentType = EContentType;

  readonly courseId = signal<string | null>(null);
  readonly selectedItem = signal<ISelectedItem>({ type: 'course' });
  readonly expandedModules = signal<Set<string>>(new Set());

  // Add-item inline forms
  readonly addingModule = signal(false);
  readonly addingLessonInModule = signal<string | null>(null);
  readonly newModuleTitle = signal('');
  readonly newLessonTitle = signal('');

  // Inline editing
  readonly editingModule = signal<string | null>(null);
  readonly editingLesson = signal<string | null>(null);
  readonly editModuleTitle = signal('');
  readonly editLessonTitle = signal('');

  // ── Content Block Modal ──
  readonly showBlockModal = signal(false);
  readonly blockModalLessonId = signal<string | null>(null);

  readonly contentTypeLabels: Record<EContentType, string> = {
    [EContentType.VIDEO]: 'Video',
    [EContentType.DOCUMENT]: 'Documento',
    [EContentType.QUIZ]: 'Quiz',
    [EContentType.ASSIGNMENT]: 'Tarea',
    [EContentType.LIVE_SESSION]: 'Sesión en Vivo',
    [EContentType.SCORM]: 'SCORM'
  };

  readonly contentTypeIcons: Record<EContentType, string> = {
    [EContentType.VIDEO]: '▶',
    [EContentType.DOCUMENT]: '📄',
    [EContentType.QUIZ]: '✏️',
    [EContentType.ASSIGNMENT]: '📝',
    [EContentType.LIVE_SESSION]: '🎙',
    [EContentType.SCORM]: '📦'
  };

  readonly difficultyLabels: Record<EDifficulty, string> = {
    [EDifficulty.BEGINNER]: 'Principiante',
    [EDifficulty.INTERMEDIATE]: 'Intermedio',
    [EDifficulty.ADVANCED]: 'Avanzado',
    [EDifficulty.EXPERT]: 'Experto'
  };

  readonly course = computed(() => {
    const id = this.courseId();
    return id ? this.uc.courses().find(c => c.id === id) ?? null : null;
  });

  readonly selectedModule = computed((): ICourseModule | null => {
    const item = this.selectedItem();
    const c = this.course();
    if (!c || item.type !== 'module') return null;
    return c.modules.find(m => m.id === item.moduleId) ?? null;
  });

  readonly selectedLesson = computed((): ILesson | null => {
    const item = this.selectedItem();
    const c = this.course();
    if (!c || (item.type !== 'lesson' && item.type !== 'block')) return null;
    for (const mod of c.modules) {
      const l = mod.lessons.find(l => l.id === item.lessonId);
      if (l) return l;
    }
    return null;
  });

  readonly totalDuration = computed(() => {
    const c = this.course();
    if (!c) return 0;
    return c.modules.reduce((s, m) => s + m.lessons.reduce((s2, l) => s2 + l.duration, 0), 0);
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.courseId.set(id);

    if (this.uc.courses().length === 0) {
      this.uc.load();
    }
  }

  // ── Navigation ──
  goBack(): void {
    this.router.navigate(['/education/courses']);
  }

  selectCoursePanel(): void {
    this.selectedItem.set({ type: 'course' });
  }

  selectModule(moduleId: string): void {
    this.selectedItem.set({ type: 'module', moduleId });
    this.toggleModuleExpand(moduleId);
  }

  selectLesson(moduleId: string, lessonId: string): void {
    this.selectedItem.set({ type: 'lesson', moduleId, lessonId });
  }

  // ── Module expand/collapse ──
  toggleModuleExpand(moduleId: string): void {
    const set = new Set(this.expandedModules());
    if (set.has(moduleId)) {
      set.delete(moduleId);
    } else {
      set.add(moduleId);
    }
    this.expandedModules.set(set);
  }

  isModuleExpanded(moduleId: string): boolean {
    return this.expandedModules().has(moduleId);
  }

  // ── Add module ──
  startAddModule(): void {
    this.addingModule.set(true);
    this.newModuleTitle.set('');
  }

  cancelAddModule(): void {
    this.addingModule.set(false);
    this.newModuleTitle.set('');
  }

  submitAddModule(): void {
    const title = this.newModuleTitle().trim();
    const id = this.courseId();
    if (!title || !id) return;
    this.uc.addModule({ courseId: id, title });
    this.cancelAddModule();
  }

  // ── Add lesson ──
  startAddLesson(moduleId: string, event: Event): void {
    event.stopPropagation();
    this.addingLessonInModule.set(moduleId);
    this.newLessonTitle.set('');
    const set = new Set(this.expandedModules());
    set.add(moduleId);
    this.expandedModules.set(set);
  }

  cancelAddLesson(): void {
    this.addingLessonInModule.set(null);
    this.newLessonTitle.set('');
  }

  submitAddLesson(): void {
    const title = this.newLessonTitle().trim();
    const moduleId = this.addingLessonInModule();
    if (!title || !moduleId) return;
    this.uc.addLesson({ moduleId, title });
    this.cancelAddLesson();
  }

  // ── Block Modal ──
  openBlockModal(lessonId: string): void {
    this.blockModalLessonId.set(lessonId);
    this.showBlockModal.set(true);
  }

  closeBlockModal(): void {
    this.showBlockModal.set(false);
    this.blockModalLessonId.set(null);
  }

  saveBlock(req: ICreateContentBlockRequest): void {
    this.uc.addContentBlock(req);
    this.closeBlockModal();
  }

  // ── Publish / Archive ──
  publishCourse(): void {
    const id = this.courseId();
    if (id) this.uc.publishCourse(id);
  }

  archiveCourse(): void {
    const id = this.courseId();
    if (id) this.uc.archiveCourse(id);
  }

  // ── Utils ──
  formatDuration(minutes: number): string {
    if (!minutes) return '0 min';
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }
}
