import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CourseEditorUseCase } from '../../../../application/course-editor.usecase';

@Component({
  selector: 'edu-course-curriculum-tree',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './course-curriculum-tree.html',
  styleUrl: './course-curriculum-tree.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseCurriculumTree {
  protected readonly uc = inject(CourseEditorUseCase);

  protected readonly expandedModules      = signal<Set<string>>(new Set());
  protected readonly addingModule         = signal(false);
  protected readonly addingLessonInModule = signal<string | null>(null);
  protected readonly newModuleTitle       = signal('');
  protected readonly newLessonTitle       = signal('');

  protected isModuleExpanded(id: string): boolean { return this.expandedModules().has(id); }

  protected toggleExpand(id: string): void {
    this.expandedModules.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  protected selectModule(id: string): void {
    this.uc.selectModule(id);
    this.toggleExpand(id);
  }

  protected startAddLesson(moduleId: string, event: Event): void {
    event.stopPropagation();
    this.addingLessonInModule.set(moduleId);
    this.newLessonTitle.set('');
    this.expandedModules.update(s => { const n = new Set(s); n.add(moduleId); return n; });
  }
  protected cancelAddLesson(): void { this.addingLessonInModule.set(null); this.newLessonTitle.set(''); }
  protected submitAddLesson(): void {
    const mid = this.addingLessonInModule();
    if (mid) this.uc.addLesson(mid, this.newLessonTitle());
    this.cancelAddLesson();
  }

  protected startAddModule(): void { this.addingModule.set(true); this.newModuleTitle.set(''); }
  protected cancelAddModule(): void { this.addingModule.set(false); this.newModuleTitle.set(''); }
  protected submitAddModule(): void { this.uc.addModule(this.newModuleTitle()); this.cancelAddModule(); }
}
