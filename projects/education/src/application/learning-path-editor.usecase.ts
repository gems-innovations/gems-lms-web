import { inject, Injectable, signal, computed } from '@angular/core';
import { LearningPathUseCase } from './learning-path.usecase';
import { CourseUseCase } from './course.usecase';
import { ILearningPath, ILearningPathStep, ELearningPathStatus } from '../domain/model/learning-path.model';
import { ICourse } from '../domain/model/course.model';

@Injectable({ providedIn: 'root' })
export class LearningPathEditorUseCase {
  private readonly lpUc     = inject(LearningPathUseCase);
  private readonly courseUc = inject(CourseUseCase);

  readonly ELearningPathStatus = ELearningPathStatus;
  readonly isLoading = computed(() => this.lpUc.isLoading() || this.courseUc.isLoading());

  private readonly _pathId            = signal<string | null>(null);
  private readonly _coursePickerSearch = signal('');

  readonly path = computed((): ILearningPath | null => {
    const id = this._pathId();
    return id ? this.lpUc.learningPaths().find(lp => lp.id === id) ?? null : null;
  });

  readonly coursePickerSearch = computed(() => this._coursePickerSearch());

  readonly availableCourses = computed((): ICourse[] => {
    const p      = this.path();
    const usedIds = new Set(p?.steps.map(s => s.courseId) ?? []);
    const term   = this._coursePickerSearch().toLowerCase();
    return this.courseUc.courses().filter(c => !usedIds.has(c.id) && (!term || c.title.toLowerCase().includes(term)));
  });

  init(pathId: string): void {
    this._pathId.set(pathId);
    if (this.lpUc.learningPaths().length === 0)  this.lpUc.load();
    if (this.courseUc.courses().length === 0)     this.courseUc.load();
  }

  setCoursePickerSearch(term: string): void { this._coursePickerSearch.set(term); }

  addCourse(course: ICourse): void {
    const p = this.path();
    if (!p) return;
    const newStep: ILearningPathStep = {
      id:                `step-${Date.now()}`,
      courseId:           course.id,
      courseTitle:        course.title,
      courseThumbnailUrl: course.thumbnailUrl,
      order:              p.steps.length + 1,
      isRequired:         true,
      estimatedDuration:  course.totalDuration
    };
    this.lpUc.update(p.id, { steps: [...p.steps, newStep] });
    this._coursePickerSearch.set('');
  }

  removeStep(stepId: string): void {
    const p = this.path();
    if (!p) return;
    const remaining = p.steps
      .filter(s => s.id !== stepId)
      .map((s, i) => ({ ...s, order: i + 1 }));
    this.lpUc.update(p.id, { steps: remaining });
  }

  moveStep(stepId: string, direction: 'up' | 'down'): void {
    const p = this.path();
    if (!p) return;
    const steps = [...p.steps];
    const idx = steps.findIndex(s => s.id === stepId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= steps.length) return;
    [steps[idx], steps[targetIdx]] = [steps[targetIdx], steps[idx]];
    this.lpUc.update(p.id, { steps: steps.map((s, i) => ({ ...s, order: i + 1 })) });
  }

  toggleRequired(stepId: string): void {
    const p = this.path();
    if (!p) return;
    this.lpUc.update(p.id, {
      steps: p.steps.map(s => s.id === stepId ? { ...s, isRequired: !s.isRequired } : s)
    });
  }

  publishPath(): void { const id = this._pathId(); if (id) this.lpUc.publishPath(id); }
  archivePath():  void { const id = this._pathId(); if (id) this.lpUc.archivePath(id); }

  formatDuration(minutes: number): string {
    if (!minutes) return '0 min';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? (m > 0 ? `${h}h ${m}min` : `${h}h`) : `${m}min`;
  }

  totalDuration(path: ILearningPath): number {
    return path.steps.reduce((s, st) => s + st.estimatedDuration, 0);
  }

  trackById(_: number, item: { id: string }): string { return item.id; }
}
