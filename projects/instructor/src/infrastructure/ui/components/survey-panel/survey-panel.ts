import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LibButtonComponent, BadgeComponent, EmptyStateComponent, LoadingSkeletonComponent } from 'shared';
import { SurveyEditorUseCase } from '../../../../application/survey.usecase';

@Component({
  selector: 'ins-survey-panel',
  standalone: true,
  imports: [FormsModule, LibButtonComponent, BadgeComponent, EmptyStateComponent, LoadingSkeletonComponent],
  templateUrl: './survey-panel.html',
  styleUrl: './survey-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurveyPanel {
  protected readonly uc = inject(SurveyEditorUseCase);

  protected readonly maxDist = computed(() =>
    Math.max(1, ...this.uc.scaleStats().flatMap(s => s.distribution))
  );
}
