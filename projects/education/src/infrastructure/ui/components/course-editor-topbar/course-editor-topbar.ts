import { Component, inject, output, ChangeDetectionStrategy } from '@angular/core';
import { CourseEditorUseCase } from '../../../../application/course-editor.usecase';

@Component({
  selector: 'edu-course-editor-topbar',
  standalone: true,
  templateUrl: './course-editor-topbar.html',
  styleUrl: './course-editor-topbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseEditorTopbar {
  protected readonly uc = inject(CourseEditorUseCase);
  readonly back = output<void>();
}
