import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import {
  PageComponent, PageHeaderComponent, StatGridComponent, StatCardComponent,
  LoadingSkeletonComponent, ProgressBarComponent, BadgeComponent,
} from 'shared';
import { InstructorStatsUseCase } from '../../../../application/instructor-stats.usecase';

@Component({
  selector: 'ins-stats-container',
  standalone: true,
  imports: [
    DecimalPipe, PageComponent, PageHeaderComponent, StatGridComponent, StatCardComponent,
    LoadingSkeletonComponent, ProgressBarComponent, BadgeComponent,
  ],
  templateUrl: './instructor-stats-container.html',
  styleUrl: './instructor-stats-container.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstructorStatsContainer implements OnInit {
  protected readonly uc = inject(InstructorStatsUseCase);

  ngOnInit(): void { this.uc.load(); }
}
