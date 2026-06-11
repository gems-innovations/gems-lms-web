import { Component, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ILearningPath, ELearningPathStatus } from '../../../../domain/model/learning-path.model';
import { formatDuration } from '../../utils/course-labels';

const PATH_STATUS_LABELS: Record<ELearningPathStatus, string> = {
  [ELearningPathStatus.DRAFT]: 'Borrador',
  [ELearningPathStatus.PUBLISHED]: 'Publicado',
  [ELearningPathStatus.ARCHIVED]: 'Archivado'
};

@Component({
  selector: 'edu-path-card',
  imports: [DecimalPipe],
  templateUrl: './path-card.html',
  styleUrl: './path-card.scss'
})
export class PathCard {
  readonly path = input.required<ILearningPath>();

  readonly publish = output<string>();
  readonly archive = output<string>();
  readonly edit = output<ILearningPath>();
  readonly remove = output<ILearningPath>();

  protected readonly ELearningPathStatus = ELearningPathStatus;
  protected readonly statusLabels = PATH_STATUS_LABELS;
  protected readonly formatDuration = formatDuration;
}
