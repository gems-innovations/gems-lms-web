import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { EnrollmentService, CourseService, LearningPathService, ICourse, ILearningPath, IStudentProfile } from 'education';
import { EnrollmentManagerView, IEnrollEvent, IEnrollResult } from '../../views/enrollment-manager-view/enrollment-manager-view';

@Component({
  selector: 'adm-enrollment-manager-container',
  standalone: true,
  imports: [EnrollmentManagerView],
  template: `
    <adm-enrollment-manager-view
      [courses]="courses()"
      [paths]="paths()"
      [students]="students()"
      [isLoading]="isLoading()"
      [result]="result()"
      (onEnroll)="enroll($event)"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EnrollmentManagerContainer implements OnInit {
  private readonly enrollmentService  = inject(EnrollmentService);
  private readonly courseService      = inject(CourseService);
  private readonly pathService        = inject(LearningPathService);

  readonly courses   = signal<ICourse[]>([]);
  readonly paths     = signal<ILearningPath[]>([]);
  readonly students  = signal<IStudentProfile[]>([]);
  readonly isLoading = signal(true);
  readonly result    = signal<IEnrollResult | null>(null);

  ngOnInit(): void {
    this.courseService.getCourses().subscribe(res => this.courses.set(res.courses));
    this.pathService.getLearningPaths().subscribe(res => this.paths.set(res.learningPaths));
    this.enrollmentService.getStudents().subscribe(s => {
      this.students.set(s);
      this.isLoading.set(false);
    });
  }

  enroll(event: IEnrollEvent): void {
    this.enrollmentService.enrollStudents(event.userIds, event.targetId, event.targetType)
      .subscribe(r => {
        this.result.set(r);
        setTimeout(() => this.result.set(null), 5000);
      });
  }
}
