import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LearningPathEditorUseCase } from '../../../../application/learning-path-editor.usecase';
import { ICourse } from '../../../../domain/model/course.model';

@Component({
  selector: 'edu-lp-editor-sequencer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lp-editor-sequencer.html',
  styleUrl: './lp-editor-sequencer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LpEditorSequencer {
  protected readonly uc = inject(LearningPathEditorUseCase);

  protected readonly showCoursePicker = signal(false);

  protected addCourse(course: ICourse): void {
    this.uc.addCourse(course);
    this.showCoursePicker.set(false);
  }
}
