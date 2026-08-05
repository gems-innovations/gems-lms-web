import { Injectable, inject, signal, computed } from '@angular/core';
import { forkJoin } from 'rxjs';
import { CourseService, EnrollmentService } from 'education';
import type { ICourse } from 'education';
import type { IEnrollmentRow, ISubmissionRow } from '../domain/model/instructor.model';

export interface IInstructorOverview {
  totalCourses: number;
  totalStudents: number;
  avgRating: number;
  pendingGrading: number;
  avgCompletion: number;
}

export interface ICourseStatRow {
  course: ICourse;
  studentCount: number;
  avgProgress: number;
  pendingCount: number;
}

@Injectable({ providedIn: 'root' })
export class InstructorStatsUseCase {
  private readonly courseService     = inject(CourseService);
  private readonly enrollmentService = inject(EnrollmentService);

  private readonly _courses     = signal<ICourse[]>([]);
  private readonly _enrollments = signal<IEnrollmentRow[]>([]);
  private readonly _submissions = signal<ISubmissionRow[]>([]);
  private readonly _isLoading   = signal(true);
  private _loaded = false;

  readonly isLoading = this._isLoading.asReadonly();

  readonly courseRows = computed<ICourseStatRow[]>(() =>
    this._courses().map(course => {
      const enr = this._enrollments().filter(e => e.courseId === course.id);
      const sub = this._submissions().filter(s => s.courseId === course.id);
      return {
        course,
        studentCount: enr.length,
        avgProgress: enr.length
          ? Math.round(enr.reduce((a, e) => a + (e.progress?.overallPercentage ?? 0), 0) / enr.length)
          : 0,
        pendingCount: sub.filter(s => s.status === 'pending').length,
      };
    })
  );

  readonly overview = computed<IInstructorOverview>(() => {
    const courses = this._courses();
    const enr = this._enrollments();
    const rated = courses.filter(c => (c.ratingCount ?? 0) > 0 && c.averageRating != null);
    const distinctStudents = new Set(enr.map(e => e.userId)).size;
    return {
      totalCourses: courses.length,
      totalStudents: distinctStudents,
      avgRating: rated.length
        ? Math.round((rated.reduce((a, c) => a + (c.averageRating ?? 0), 0) / rated.length) * 10) / 10
        : 0,
      pendingGrading: this._submissions().filter(s => s.status === 'pending').length,
      avgCompletion: courses.length
        ? Math.round(courses.reduce((a, c) => a + (c.completionRate ?? 0), 0) / courses.length)
        : 0,
    };
  });

  load(): void {
    if (this._loaded) return;
    this._loaded = true;
    this._isLoading.set(true);
    forkJoin({
      courses:     this.courseService.getCourses(),
      enrollments: this.enrollmentService.getAllCourseEnrollments(),
      submissions: this.enrollmentService.getAllSubmissions(),
    }).subscribe(({ courses, enrollments, submissions }) => {
      this._courses.set(courses.courses);
      this._enrollments.set(enrollments as IEnrollmentRow[]);
      this._submissions.set(submissions as ISubmissionRow[]);
      this._isLoading.set(false);
    });
  }
}
