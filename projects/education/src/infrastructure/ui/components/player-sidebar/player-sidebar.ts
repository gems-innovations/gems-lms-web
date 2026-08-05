import { Component, input, output, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ICourse, ILesson, EContentType } from '../../../../domain/model/course.model';
import { formatDuration } from '../../utils/course-labels';

@Component({
  selector: 'edu-player-sidebar',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './player-sidebar.html',
  styleUrl: './player-sidebar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerSidebar {
  readonly course            = input.required<ICourse>();
  readonly selectedLessonId  = input<string | null>(null);
  readonly completedBlockIds = input<Set<string>>(new Set());
  readonly courseProgress    = input<number>(0);
  readonly sidebarWidthPx    = input<number | null>(null);
  readonly collapsed         = input<boolean>(false);

  readonly selectedBlockId   = input<string | null>(null);
  readonly lockedLessonIds   = input<Set<string>>(new Set());
  readonly lockedBlockIds    = input<Set<string>>(new Set());
  readonly hasSurvey         = input<boolean>(false);
  readonly surveyUnlocked    = input<boolean>(false);

  readonly selectLesson = output<string>();
  readonly selectBlock  = output<string>();
  readonly resizeStart  = output<MouseEvent>();
  readonly surveyClick  = output<void>();

  protected readonly EContentType = EContentType;

  protected readonly expandedModuleIds = signal<Set<string>>(new Set());

  constructor() {
    effect(() => {
      const ids = this.course().modules?.map(m => m.id) ?? [];
      if (ids.length > 0 && this.expandedModuleIds().size === 0) {
        this.expandedModuleIds.set(new Set(ids));
      }
    });
  }

  protected isModuleExpanded(id: string): boolean { return this.expandedModuleIds().has(id); }

  protected toggleModule(id: string): void {
    this.expandedModuleIds.update(s => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  protected isLessonLocked(lesson: ILesson): boolean {
    return this.lockedLessonIds().has(lesson.id);
  }

  protected isBlockLocked(blockId: string): boolean {
    return this.lockedBlockIds().has(blockId);
  }

  protected isLessonComplete(lesson: ILesson): boolean {
    const ids = this.completedBlockIds();
    return lesson.contentBlocks.length > 0 && lesson.contentBlocks.every(b => ids.has(b.id));
  }

  protected getFlatLessonNumber(moduleIdx: number, lessonIdx: number): number {
    const c = this.course();
    let count = 0;
    for (let i = 0; i < moduleIdx; i++) count += c.modules[i].lessons.length;
    return count + lessonIdx + 1;
  }

  protected formatDuration(minutes: number): string { return formatDuration(minutes); }

  protected lessonPrimaryType(lesson: ILesson): EContentType {
    return lesson.contentBlocks?.[0]?.type ?? EContentType.DOCUMENT;
  }

  protected lessonThumbUrl(lesson: ILesson): string | null {
    const block = lesson.contentBlocks?.[0];
    if (!block) return null;
    if (block.videoThumbnailUrl) return block.videoThumbnailUrl;
    if (block.type === EContentType.VIDEO && block.url) {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = block.url.match(regExp);
      if (match && match[2].length === 11) {
        return `https://img.youtube.com/vi/${match[2]}/mqdefault.jpg`;
      }
    }
    return null;
  }

  protected blockTypeLabel(type: EContentType): string {
    const map: Record<string, string> = {
      video: 'Video', document: 'Doc', quiz: 'Quiz',
      assignment: 'Tarea', 'live-session': 'Live', scorm: 'SCORM',
    };
    return map[type] ?? type;
  }
}
