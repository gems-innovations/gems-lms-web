import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import {
  PageComponent, PageHeaderComponent, CardGridComponent,
  LoadingSkeletonComponent, EmptyStateComponent, PaginationComponent,
  SearchBarComponent,
} from 'shared';
import { InstructorCoursesUseCase } from '../../../../application/instructor-courses.usecase';
import { InstructorCourseSummaryCard } from '../../components/instructor-course-summary-card/instructor-course-summary-card';
import type { ICourseSummary } from '../../components/instructor-course-summary-card/instructor-course-summary-card';

const PAGE_SIZE = 6;

@Component({
  selector: 'ins-courses-container',
  standalone: true,
  imports: [
    PageComponent, PageHeaderComponent, CardGridComponent,
    LoadingSkeletonComponent, EmptyStateComponent, PaginationComponent,
    SearchBarComponent, InstructorCourseSummaryCard,
  ],
  templateUrl: './instructor-courses-container.html',
  styleUrl: './instructor-courses-container.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstructorCoursesContainer implements OnInit {
  private readonly router = inject(Router);
  protected readonly uc   = inject(InstructorCoursesUseCase);

  protected readonly page = signal(1);

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.uc.filteredCourses().length / PAGE_SIZE))
  );

  protected readonly pagedCourses = computed(() => {
    const p = this.page();
    return this.uc.filteredCourses().slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
  });

  ngOnInit(): void { this.uc.load(); }

  protected onSearch(v: string): void { this.uc.search.set(v); this.page.set(1); }

  protected openCourse(summary: ICourseSummary): void {
    const firstGroup = this.uc.cohortsForCourse(summary.course.id)[0]?.group.id;
    if (firstGroup) {
      this.router.navigate(['/instructor/courses', summary.course.id, firstGroup]);
    } else {
      this.router.navigate(['/instructor/courses', summary.course.id]);
    }
  }
}
