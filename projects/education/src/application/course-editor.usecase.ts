import { inject, Injectable, signal, computed } from '@angular/core';
import { CourseUseCase } from './course.usecase';
import {
  ICourse, ICourseModule, ILesson,
  ECourseStatus, EDifficulty, EContentType,
  ICreateContentBlockRequest
} from '../domain/model/course.model';

export type TEditorPanel = 'course' | 'module' | 'lesson' | 'block';

export interface ISelectedItem {
  type: TEditorPanel;
  moduleId?: string;
  lessonId?: string;
  blockId?: string;
}

@Injectable({ providedIn: 'root' })
export class CourseEditorUseCase {
  private readonly courseUc = inject(CourseUseCase);

  readonly ECourseStatus = ECourseStatus;
  readonly EDifficulty   = EDifficulty;
  readonly EContentType  = EContentType;

  readonly contentTypeLabels: Record<EContentType, string> = {
    [EContentType.VIDEO]:        'Video',
    [EContentType.DOCUMENT]:     'Documento',
    [EContentType.QUIZ]:         'Quiz',
    [EContentType.ASSIGNMENT]:   'Tarea',
    [EContentType.LIVE_SESSION]: 'Sesión en Vivo',
    [EContentType.SCORM]:        'SCORM'
  };

  readonly difficultyLabels: Record<EDifficulty, string> = {
    [EDifficulty.BEGINNER]:     'Principiante',
    [EDifficulty.INTERMEDIATE]: 'Intermedio',
    [EDifficulty.ADVANCED]:     'Avanzado',
    [EDifficulty.EXPERT]:       'Experto'
  };

  private readonly _courseId     = signal<string | null>(null);
  private readonly _selectedItem = signal<ISelectedItem>({ type: 'course' });

  readonly isLoading    = computed(() => this.courseUc.isLoading());
  readonly loadError    = computed(() => this.courseUc.error());
  readonly courseId     = computed(() => this._courseId());
  readonly selectedItem = computed(() => this._selectedItem());

  readonly course = computed((): ICourse | null => {
    const id = this._courseId();
    return id ? this.courseUc.courses().find(c => c.id === id) ?? null : null;
  });

  readonly selectedModule = computed((): ICourseModule | null => {
    const item = this._selectedItem();
    const c    = this.course();
    if (!c || item.type !== 'module') return null;
    return c.modules.find(m => m.id === item.moduleId) ?? null;
  });

  readonly selectedLesson = computed((): ILesson | null => {
    const item = this._selectedItem();
    const c    = this.course();
    if (!c || (item.type !== 'lesson' && item.type !== 'block')) return null;
    for (const mod of c.modules) {
      const l = mod.lessons.find(l => l.id === item.lessonId);
      if (l) return l;
    }
    return null;
  });

  readonly totalDuration = computed((): number => {
    const c = this.course();
    if (!c) return 0;
    return c.modules.reduce((s, m) => s + m.lessons.reduce((s2, l) => s2 + l.duration, 0), 0);
  });

  init(courseId: string): void {
    this._courseId.set(courseId);
    if (this.courseUc.courses().length === 0) this.courseUc.load();
  }

  retry(): void { this.courseUc.load(); }

  selectCoursePanel(): void { this._selectedItem.set({ type: 'course' }); }
  selectModule(moduleId: string): void { this._selectedItem.set({ type: 'module', moduleId }); }
  selectLesson(moduleId: string, lessonId: string): void { this._selectedItem.set({ type: 'lesson', moduleId, lessonId }); }

  addModule(title: string): void {
    const id = this._courseId();
    if (!title.trim() || !id) return;
    this.courseUc.addModule({ courseId: id, title: title.trim() });
  }

  addLesson(moduleId: string, title: string): void {
    if (!title.trim() || !moduleId) return;
    this.courseUc.addLesson({ moduleId, title: title.trim() });
  }

  saveBlock(req: ICreateContentBlockRequest): void { this.courseUc.addContentBlock(req); }
  setThumbnail(url: string): void { const id = this._courseId(); if (id) this.courseUc.update(id, { thumbnailUrl: url }); }
  publishCourse(): void { const id = this._courseId(); if (id) this.courseUc.publishCourse(id); }
  archiveCourse(): void { const id = this._courseId(); if (id) this.courseUc.archiveCourse(id); }

  formatDuration(minutes: number): string {
    if (!minutes) return '0 min';
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }

  trackById(_: number, item: { id: string }): string { return item.id; }
}
