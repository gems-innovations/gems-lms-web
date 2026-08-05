import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CourseEditorUseCase } from '../../../../application/course-editor.usecase';
import { ContentBlockModal } from '../content-block-modal/content-block-modal';
import { CoursePlayerPreview } from '../course-player-preview/course-player-preview';
import { ICreateContentBlockRequest, IContentBlock } from '../../../../domain/model/course.model';

@Component({
  selector: 'edu-course-editor-panel',
  standalone: true,
  imports: [CommonModule, ContentBlockModal, CoursePlayerPreview],
  templateUrl: './course-editor-panel.html',
  styleUrl: './course-editor-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseEditorPanel {
  protected readonly uc = inject(CourseEditorUseCase);

  protected readonly showBlockModal      = signal(false);
  protected readonly blockModalLessonId  = signal<string | null>(null);
  protected readonly previewBlock        = signal<IContentBlock | null>(null);

  protected openBlockModal(lessonId: string): void { this.blockModalLessonId.set(lessonId); this.showBlockModal.set(true); }
  protected closeBlockModal(): void { this.showBlockModal.set(false); this.blockModalLessonId.set(null); }
  protected saveBlock(req: ICreateContentBlockRequest): void { this.uc.saveBlock(req); this.closeBlockModal(); }

  protected openPreview(block: IContentBlock): void { this.previewBlock.set(block); }
  protected closePreview(): void { this.previewBlock.set(null); }
}
