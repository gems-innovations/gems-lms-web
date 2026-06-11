import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LearningPathUseCase } from '../../../../application/learning-path.usecase';
import { CourseUseCase } from '../../../../application/course.usecase';
import {
  ILearningPath,
  ILearningPathStep,
  ELearningPathStatus
} from '../../../../domain/model/learning-path.model';
import { ICourse } from '../../../../domain/model/course.model';

@Component({
  selector: 'edu-learning-path-editor-container',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './learning-path-editor-container.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './learning-path-editor-container.scss'
})
export class LearningPathEditorContainer implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly uc = inject(LearningPathUseCase);
  readonly courseUc = inject(CourseUseCase);

  readonly ELearningPathStatus = ELearningPathStatus;

  readonly pathId = signal<string | null>(null);
  readonly showCoursePicker = signal(false);
  readonly coursePickerSearch = signal('');

  readonly path = computed(() => {
    const id = this.pathId();
    return id ? this.uc.learningPaths().find(lp => lp.id === id) ?? null : null;
  });

  readonly availableCourses = computed(() => {
    const p = this.path();
    const usedIds = new Set(p?.steps.map(s => s.courseId) ?? []);
    const term = this.coursePickerSearch().toLowerCase();
    return this.courseUc.courses().filter(c => {
      const notUsed = !usedIds.has(c.id);
      const matchesTerm = !term || c.title.toLowerCase().includes(term);
      return notUsed && matchesTerm;
    });
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.pathId.set(id);

    if (this.uc.learningPaths().length === 0) this.uc.load();
    if (this.courseUc.courses().length === 0) this.courseUc.load();
  }

  goBack(): void {
    this.router.navigate(['/education/learning-paths']);
  }

  // ── Step management ──
  addCourse(course: ICourse): void {
    const p = this.path();
    if (!p) return;
    const newStep: ILearningPathStep = {
      id: `step-${Date.now()}`,
      courseId: course.id,
      courseTitle: course.title,
      courseThumbnailUrl: course.thumbnailUrl,
      order: p.steps.length + 1,
      isRequired: true,
      estimatedDuration: course.totalDuration
    };
    this.uc.update(p.id, { steps: [...p.steps, newStep] });
    this.showCoursePicker.set(false);
    this.coursePickerSearch.set('');
  }

  removeStep(stepId: string): void {
    const p = this.path();
    if (!p) return;
    const remaining = p.steps
      .filter(s => s.id !== stepId)
      .map((s, i) => ({ ...s, order: i + 1 }));
    this.uc.update(p.id, { steps: remaining });
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
    const reordered = steps.map((s, i) => ({ ...s, order: i + 1 }));
    this.uc.update(p.id, { steps: reordered });
  }

  toggleRequired(stepId: string): void {
    const p = this.path();
    if (!p) return;
    const steps = p.steps.map(s =>
      s.id === stepId ? { ...s, isRequired: !s.isRequired } : s
    );
    this.uc.update(p.id, { steps });
  }

  // ── Publish / archive ──
  publishPath(): void {
    const id = this.pathId();
    if (id) this.uc.publishPath(id);
  }

  archivePath(): void {
    const id = this.pathId();
    if (id) this.uc.archivePath(id);
  }

  // ── Utils ──
  formatDuration(minutes: number): string {
    if (!minutes) return '0 min';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? (m > 0 ? `${h}h ${m}min` : `${h}h`) : `${m}min`;
  }

  totalDuration(path: ILearningPath): number {
    return path.steps.reduce((s, st) => s + st.estimatedDuration, 0);
  }

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }
}
