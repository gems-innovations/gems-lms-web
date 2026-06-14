import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { InstructorUseCase } from '../../../../application/instructor.usecase';
import { IInstructorNotification } from '../../../services/notification.service';
import {
  PageComponent, PageHeaderComponent, StatGridComponent,
  StatCardComponent, LoadingSkeletonComponent, EmptyStateComponent,
} from 'shared';
import { InstructorCourseCard } from '../../components/instructor-course-card/instructor-course-card';
import { InstructorNotificationsPanel } from '../../components/instructor-notifications-panel/instructor-notifications-panel';
import { InstructorStudentTable } from '../../components/instructor-student-table/instructor-student-table';
import { InstructorAssignmentsList } from '../../components/instructor-assignments-list/instructor-assignments-list';
import { InstructorSubmissionsTable } from '../../components/instructor-submissions-table/instructor-submissions-table';
import { InstructorSubmissionDetail } from '../../components/instructor-submission-detail/instructor-submission-detail';
import { ISubmissionRow, IGradeSubmitEvent } from '../../../../domain/model/instructor.model';

@Component({
  selector: 'edu-instructor-container',
  standalone: true,
  imports: [
    PageComponent, PageHeaderComponent, StatGridComponent, StatCardComponent,
    LoadingSkeletonComponent, EmptyStateComponent,
    InstructorCourseCard, InstructorNotificationsPanel, InstructorStudentTable,
    InstructorAssignmentsList, InstructorSubmissionsTable, InstructorSubmissionDetail,
  ],
  templateUrl: './instructor-container.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstructorContainer implements OnInit {
  protected readonly uc = inject(InstructorUseCase);

  ngOnInit(): void { this.uc.load(); }

  protected openSubmission(sub: ISubmissionRow): void { this.uc.openSubmission(sub); }
  protected grade(event: IGradeSubmitEvent): void { this.uc.grade(event); }
  protected handleNotification(n: IInstructorNotification): void { this.uc.handleNotification(n); }
}
