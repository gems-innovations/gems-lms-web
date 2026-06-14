import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LearningPathEditorUseCase } from '../../../../application/learning-path-editor.usecase';
import { LpEditorTopbar } from '../../components/lp-editor-topbar/lp-editor-topbar';
import { LpEditorSidebar } from '../../components/lp-editor-sidebar/lp-editor-sidebar';
import { LpEditorSequencer } from '../../components/lp-editor-sequencer/lp-editor-sequencer';

@Component({
  selector: 'edu-learning-path-editor-container',
  standalone: true,
  imports: [LpEditorTopbar, LpEditorSidebar, LpEditorSequencer],
  templateUrl: './learning-path-editor-container.html',
  host: { class: 'lpeditor' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearningPathEditorContainer implements OnInit {
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly uc   = inject(LearningPathEditorUseCase);

  ngOnInit(): void { this.uc.init(this.route.snapshot.paramMap.get('id') ?? ''); }

  protected goBack(): void { this.router.navigate(['/education/learning-paths']); }
}
