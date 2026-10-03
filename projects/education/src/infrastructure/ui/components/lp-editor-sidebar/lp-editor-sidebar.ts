import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageUploadComponent } from 'shared';
import { LearningPathEditorUseCase } from '../../../../application/learning-path-editor.usecase';

@Component({
  selector: 'edu-lp-editor-sidebar',
  standalone: true,
  imports: [CommonModule, ImageUploadComponent],
  templateUrl: './lp-editor-sidebar.html',
  styleUrl: './lp-editor-sidebar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LpEditorSidebar {
  protected readonly uc = inject(LearningPathEditorUseCase);
}
