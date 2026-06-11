import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CourseService } from '../../../services/course.service';
import { EnrollmentService } from '../../../services/enrollment.service';
import { NotificationService } from '../../../services/notification.service';
import { InstructorView, IEnrollmentRow, ISubmissionRow, IGradeSubmissionEvent } from '../../views/instructor-view/instructor-view';
import { ICourse } from '../../../../domain/model/course.model';

@Component({
  selector: 'edu-instructor-container',
  standalone: true,
  imports: [InstructorView],
  template: `
    <edu-instructor-view
      [courses]="courses()"
      [enrollments]="enrollments()"
      [submissions]="submissions()"
      [notifications]="notificationService.notifications()"
      [unreadCount]="notificationService.unreadCount()"
      [isLoading]="isLoading()"
      (onGrade)="grade($event)"
      (onMarkRead)="notificationService.markRead($event)"
      (onMarkAllRead)="notificationService.markAllRead()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InstructorContainer implements OnInit {
  private readonly courseService      = inject(CourseService);
  private readonly enrollmentService  = inject(EnrollmentService);
  readonly notificationService        = inject(NotificationService);

  readonly courses     = signal<ICourse[]>([]);
  readonly enrollments = signal<IEnrollmentRow[]>([]);
  readonly submissions = signal<ISubmissionRow[]>([]);
  readonly isLoading   = signal(true);

  ngOnInit(): void {
    this.courseService.getCourses().subscribe(res => {
      this.courses.set(res.courses);
    });

    this.enrollmentService.getAllCourseEnrollments().subscribe(rows => {
      this.enrollments.set(rows as IEnrollmentRow[]);
      this.isLoading.set(false);
    });

    this.enrollmentService.getAllSubmissions().subscribe(rows => {
      this.submissions.set(rows as ISubmissionRow[]);
    });
  }

  grade(event: IGradeSubmissionEvent): void {
    this.enrollmentService.gradeSubmission(event.submissionId, event.grade, event.feedback)
      .subscribe(updated => {
        this.submissions.update(list =>
          list.map(s => s.id === updated.id ? { ...s, ...updated } : s)
        );
      });
  }
}
