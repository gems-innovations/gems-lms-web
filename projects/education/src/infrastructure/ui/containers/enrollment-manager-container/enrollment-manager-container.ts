import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CourseService } from '../../../services/course.service';
import { EnrollmentService } from '../../../services/enrollment.service';
import { EnrollmentManagerView, IEnrollSingleEvent, IBulkEnrollEntry, IBulkResult } from '../../views/enrollment-manager-view/enrollment-manager-view';
import { ICourse } from '../../../../domain/model/course.model';
import { IStudentProfile } from '../../../services/enrollment.service';

@Component({
  selector: 'edu-enrollment-manager-container',
  standalone: true,
  imports: [EnrollmentManagerView],
  template: `
    <edu-enrollment-manager-view
      [courses]="courses()"
      [students]="students()"
      [isLoading]="isLoading()"
      [bulkResult]="bulkResult()"
      (onEnrollSingle)="enrollSingle($event)"
      (onBulkEnroll)="bulkEnroll($event)"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EnrollmentManagerContainer implements OnInit {
  private readonly courseService      = inject(CourseService);
  private readonly enrollmentService  = inject(EnrollmentService);

  readonly courses    = signal<ICourse[]>([]);
  readonly students   = signal<IStudentProfile[]>([]);
  readonly isLoading  = signal(true);
  readonly bulkResult = signal<IBulkResult | null>(null);

  ngOnInit(): void {
    this.courseService.getCourses().subscribe(res => {
      this.courses.set(res.courses);
    });

    this.enrollmentService.getStudents().subscribe(s => {
      this.students.set(s);
      this.isLoading.set(false);
    });
  }

  enrollSingle(event: IEnrollSingleEvent): void {
    this.enrollmentService.enrollStudent(event.userId, event.courseId).subscribe(() => {
      this.bulkResult.set({ success: 1, skipped: 0, errors: [] });
      setTimeout(() => this.bulkResult.set(null), 4000);
    });
  }

  bulkEnroll(entries: IBulkEnrollEntry[]): void {
    this.enrollmentService.bulkEnroll(entries).subscribe(result => {
      this.bulkResult.set(result);
    });
  }
}
