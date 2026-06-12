import { Component, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { ICourse } from '../../../../domain/model/course.model';
import { formatDuration } from '../../utils/course-labels';

@Component({
  selector: 'edu-preview-course-outline',
  templateUrl: './preview-course-outline.html',
  styleUrl: './preview-course-outline.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewCourseOutline {
  readonly course = input.required<ICourse>();

  private readonly expanded = signal<Set<string>>(new Set());

  protected isExpanded(id: string): boolean { return this.expanded().has(id); }

  protected toggleModule(id: string): void {
    this.expanded.update(s => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  protected formatDuration(min: number): string { return formatDuration(min); }

  protected lessonTypeLabel(type: string): string {
    const map: Record<string, string> = {
      video: 'Video', text: 'Texto', quiz: 'Quiz',
      assignment: 'Tarea', document: 'Documento'
    };
    return map[type] ?? type;
  }
}
