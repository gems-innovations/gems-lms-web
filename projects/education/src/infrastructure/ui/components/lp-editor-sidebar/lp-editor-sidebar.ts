import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LearningPathEditorUseCase } from '../../../../application/learning-path-editor.usecase';

@Component({
  selector: 'edu-lp-editor-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lp-editor-sidebar.html',
  styleUrl: './lp-editor-sidebar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LpEditorSidebar {
  protected readonly uc = inject(LearningPathEditorUseCase);
}
