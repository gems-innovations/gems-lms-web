import { Component, inject, output, ChangeDetectionStrategy } from '@angular/core';
import { LearningPathEditorUseCase } from '../../../../application/learning-path-editor.usecase';

@Component({
  selector: 'edu-lp-editor-topbar',
  standalone: true,
  templateUrl: './lp-editor-topbar.html',
  styleUrl: './lp-editor-topbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LpEditorTopbar {
  protected readonly uc = inject(LearningPathEditorUseCase);
  readonly back = output<void>();
}
