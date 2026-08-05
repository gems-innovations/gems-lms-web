import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import {
  PageComponent, PageHeaderComponent, StatGridComponent, StatCardComponent,
  LoadingSkeletonComponent, BackButtonComponent, TabsComponent, LibButtonComponent,
  EmptyStateComponent, LibSelectComponent,
} from 'shared';
import type { SelectOption } from 'shared';
import { CourseDetailUseCase } from '../../../../application/course-detail.usecase';
import { SurveyEditorUseCase } from '../../../../application/survey.usecase';
import { ExportUseCase } from '../../../../application/export.usecase';
import { InstructorCoursesUseCase } from '../../../../application/instructor-courses.usecase';
import { StudentsTable } from '../../components/students-table/students-table';
import { GradingPanel } from '../../components/grading-panel/grading-panel';
import { ReviewCard } from '../../components/review-card/review-card';
import { StudentDetail } from '../../components/student-detail/student-detail';
import { SurveyPanel } from '../../components/survey-panel/survey-panel';
import type { ISubmissionRow, IGradeSubmitEvent, TCourseDetailTab } from '../../../../domain/model/instructor.model';

@Component({
  selector: 'ins-course-detail-container',
  standalone: true,
  imports: [
    DecimalPipe, PageComponent, PageHeaderComponent, StatGridComponent, StatCardComponent,
    LoadingSkeletonComponent, BackButtonComponent, TabsComponent, LibButtonComponent,
    EmptyStateComponent, LibSelectComponent, StudentsTable, GradingPanel, ReviewCard, StudentDetail, SurveyPanel,
  ],
  providers: [CourseDetailUseCase, SurveyEditorUseCase],
  templateUrl: './course-detail-container.html',
  styleUrl: './course-detail-container.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseDetailContainer implements OnInit {
  private readonly route        = inject(ActivatedRoute);
  private readonly router       = inject(Router);
  private readonly exportUc     = inject(ExportUseCase);
  private readonly coursesUc    = inject(InstructorCoursesUseCase);
  protected readonly uc         = inject(CourseDetailUseCase);
  protected readonly surveyUc   = inject(SurveyEditorUseCase);

  private courseId = '';
  protected readonly groupId = signal('');

  protected readonly groupOptions = computed<SelectOption[]>(() =>
    this.coursesUc.cohortsForCourse(this.courseId).map(c => ({ value: c.group.id, label: c.group.name }))
  );

  ngOnInit(): void {
    const params = this.route.snapshot.paramMap;
    this.courseId = params.get('id') ?? params.get('courseId') ?? '';
    this.groupId.set(params.get('groupId') ?? '');
    this.coursesUc.load();
    this.uc.init(this.courseId, this.groupId());
    this.surveyUc.init(this.courseId, this.groupId());
  }

  protected setTab(tab: string): void { this.uc.setActiveTab(tab as TCourseDetailTab); }
  protected backToCourses(): void { this.router.navigate(['/instructor/courses']); }
  protected editContent(): void {
    this.router.navigate(['/instructor/courses', this.courseId, this.groupId(), 'edit']);
  }
  protected openSubmission(sub: ISubmissionRow): void { this.uc.openSubmission(sub); }
  protected grade(event: IGradeSubmitEvent): void { this.uc.grade(event); }

  protected changeGroup(groupId: string): void {
    if (!groupId || groupId === this.groupId()) return;
    this.groupId.set(groupId);
    this.uc.init(this.courseId, groupId);
    this.surveyUc.init(this.courseId, groupId);
    this.router.navigate(['/instructor/courses', this.courseId, groupId], { replaceUrl: true });
  }

  protected exportExcel(): void {
    const course = this.uc.course();
    if (!course) return;
    void this.exportUc.studentsExcel(
      course.title, this.uc.enrollments(), this.uc.assignments(), this.uc.submissions(),
    );
  }
}
