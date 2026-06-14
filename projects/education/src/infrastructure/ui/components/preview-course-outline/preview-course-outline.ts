import { Component, input, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { ICourse, ILesson, EContentType } from '../../../../domain/model/course.model';
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

  constructor() {
    effect(() => {
      const firstId = this.course().modules?.[0]?.id;
      if (firstId && this.expanded().size === 0) {
        this.expanded.set(new Set([firstId]));
      }
    });
  }

  protected isExpanded(id: string): boolean { return this.expanded().has(id); }

  protected toggleModule(id: string): void {
    this.expanded.update(s => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  protected formatDuration(min: number): string { return formatDuration(min); }

  protected lessonThumbUrl(lesson: ILesson): string | null {
    const block = lesson.contentBlocks?.[0];
    if (!block) return null;
    if (block.videoThumbnailUrl) return block.videoThumbnailUrl;
    if (block.type === EContentType.VIDEO && block.url) {
      const m = block.url.match(/embed\/([^?/]+)/);
      if (m) return `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg`;
    }
    return null;
  }

  protected blockTypeLabel(type: EContentType): string {
    const map: Record<string, string> = {
      video: 'Video', document: 'Documento', quiz: 'Quiz',
      assignment: 'Tarea', 'live-session': 'Sesión en vivo', scorm: 'SCORM'
    };
    return map[type] ?? type;
  }

  protected stars(rating: number): string[] {
    return [1, 2, 3, 4, 5].map(i =>
      i <= Math.floor(rating) ? 'full' : (i - rating < 1 ? 'half' : 'empty')
    );
  }

  protected formatRatingCount(n: number): string {
    return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;
  }
}
