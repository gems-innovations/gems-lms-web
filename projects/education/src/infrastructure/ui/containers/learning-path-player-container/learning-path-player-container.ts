import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LearningPathPlayerUseCase } from '../../../../application/learning-path-player.usecase';
import { LoadingSkeletonComponent, EmptyStateComponent } from 'shared';
import { PathPlayerHero } from '../../components/path-player-hero/path-player-hero';
import { PathStepList } from '../../components/path-step-list/path-step-list';
import { IStepEntry } from '../../../../domain/model/learning-path.model';

@Component({
  selector: 'edu-learning-path-player-container',
  standalone: true,
  imports: [LoadingSkeletonComponent, EmptyStateComponent, PathPlayerHero, PathStepList],
  templateUrl: './learning-path-player-container.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearningPathPlayerContainer implements OnInit {
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly uc   = inject(LearningPathPlayerUseCase);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.uc.init(id);
  }

  protected startCourse(entry: IStepEntry): void {
    if (!entry.isLocked) this.router.navigate(['/learn/courses', entry.step.courseId]);
  }

  protected goHome(): void { this.router.navigate(['/learn/home']); }
}
