import { Component, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ICourse, ICourseModule, ILesson } from '../../../../domain/model/course.model';

export interface ISidebarLesson {
  lesson: ILesson;
  module: ICourseModule;
  lessonNumber: number;
  isSelected: boolean;
  isComplete: boolean;
}

@Component({
  selector: 'edu-player-sidebar',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './player-sidebar.html',
  styleUrl: './player-sidebar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerSidebar {
  readonly course          = input.required<ICourse>();
  readonly selectedLessonId = input<string | null>(null);
  readonly completedBlockIds = input<Set<string>>(new Set());
  readonly courseProgress  = input<number>(0);
  readonly sidebarWidth    = input<number>(500);
  readonly collapsed       = input<boolean>(false);

  readonly selectLesson    = output<string>();
  readonly toggleCollapse  = output<void>();
  readonly resizeStart     = output<MouseEvent>();

  protected readonly expandedModuleIds = signal<Set<string>>(new Set());

  protected isModuleExpanded(moduleId: string): boolean {
    return this.expandedModuleIds().has(moduleId);
  }

  protected toggleModule(moduleId: string): void {
    this.expandedModuleIds.update(s => {
      const next = new Set(s);
      next.has(moduleId) ? next.delete(moduleId) : next.add(moduleId);
      return next;
    });
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

  protected formatDuration(minutes: number): string {
    if (!minutes) return '—';
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
}
