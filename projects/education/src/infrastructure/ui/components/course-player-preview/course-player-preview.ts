import { Component, input, output, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { PlayerContentBlock } from '../player-content-block/player-content-block';
import type { IContentBlock } from '../../../../domain/model/course.model';

@Component({
  selector: 'edu-course-player-preview',
  standalone: true,
  imports: [PlayerContentBlock],
  templateUrl: './course-player-preview.html',
  styleUrl: './course-player-preview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoursePlayerPreview {
  readonly block = input.required<IContentBlock | null>();
  readonly close = output<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void { this.close.emit(); }
}
