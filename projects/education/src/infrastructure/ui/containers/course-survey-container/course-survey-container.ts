import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  PageComponent, PageHeaderComponent, LoadingSkeletonComponent, EmptyStateComponent,
  LibButtonComponent, BackButtonComponent,
} from 'shared';
import { CourseSurveyUseCase } from '../../../../application/course-survey.usecase';

@Component({
  selector: 'edu-course-survey-container',
  standalone: true,
  imports: [
    PageComponent, PageHeaderComponent, LoadingSkeletonComponent, EmptyStateComponent,
    LibButtonComponent, BackButtonComponent,
  ],
  providers: [CourseSurveyUseCase],
  templateUrl: './course-survey-container.html',
  styleUrl: './course-survey-container.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseSurveyContainer implements OnInit {
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly uc   = inject(CourseSurveyUseCase);

  protected readonly scaleValues = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  ngOnInit(): void {
    this.uc.init(this.route.snapshot.paramMap.get('id') ?? '');
  }

  protected goBack(): void { this.router.navigate(['/learn/my-learning']); }
  protected asString(v: number | string | undefined): string { return v == null ? '' : String(v); }

  /** Una sección se puede visitar si ya fue vista, o si es la actual, o la siguiente inmediata (y la actual está completa). */
  protected canJumpTo(index: number): boolean {
    if (this.uc.visited().has(index)) return true;
    if (index === this.uc.sectionIndex() + 1) return this.uc.currentSectionAnswered();
    return false;
  }

  protected scaleBtnClass(value: number, selected: number | string | undefined): string {
    const classes = ['csv__scale-btn'];
    if (selected === value) {
      classes.push('csv__scale-btn--active');
      if (value <= 4) classes.push('csv__scale-btn--low');
      else if (value <= 7) classes.push('csv__scale-btn--mid');
      else classes.push('csv__scale-btn--high');
    }
    return classes.join(' ');
  }
}
