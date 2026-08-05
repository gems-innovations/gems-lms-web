import { Component, inject, OnInit, computed, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  PageComponent, PageHeaderComponent, CardGridComponent,
  LoadingSkeletonComponent, EmptyStateComponent, BackButtonComponent,
} from 'shared';
import { InstructorCoursesUseCase } from '../../../../application/instructor-courses.usecase';
import { InstructorCourseCard } from '../../components/instructor-course-card/instructor-course-card';
import type { ICohort } from '../../../../domain/model/instructor.model';

@Component({
  selector: 'ins-course-groups-container',
  standalone: true,
  imports: [
    PageComponent, PageHeaderComponent, CardGridComponent,
    LoadingSkeletonComponent, EmptyStateComponent, BackButtonComponent, InstructorCourseCard,
  ],
  templateUrl: './course-groups-container.html',
  styleUrl: './course-groups-container.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseGroupsContainer implements OnInit {
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly uc   = inject(InstructorCoursesUseCase);

  private courseId = '';

  readonly cohortsForCourse = computed<ICohort[]>(() => this.uc.cohortsForCourse(this.courseId));
  readonly courseTitle = computed<string>(() => this.cohortsForCourse()[0]?.course.title ?? '');

  ngOnInit(): void {
    this.courseId = this.route.snapshot.paramMap.get('courseId') ?? '';
    this.uc.load();
  }

  protected backToCourses(): void { this.router.navigate(['/instructor/courses']); }

  protected openCohort(cohort: ICohort): void {
    this.router.navigate(['/instructor/courses', cohort.course.id, cohort.group.id]);
  }
}
