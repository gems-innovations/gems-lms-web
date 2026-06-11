import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { CourseService } from '../../../services/course.service';
import { LearningPathService } from '../../../services/learning-path.service';
import { EnrollmentService } from '../../../services/enrollment.service';
import { CourseCatalogView, ICatalogEnrollAction } from '../../views/course-catalog-view/course-catalog-view';
import { ICourse } from '../../../../domain/model/course.model';
import { ILearningPath } from '../../../../domain/model/learning-path.model';

@Component({
  selector: 'edu-course-catalog-container',
  standalone: true,
  imports: [CourseCatalogView],
  template: `
    <edu-course-catalog-view
      [courses]="courses()"
      [paths]="paths()"
      [enrolledIds]="enrolledIds()"
      [enrolledPathIds]="enrolledPathIds()"
      [isLoading]="isLoading()"
      (onEnroll)="enroll($event)"
      (onOpenCourse)="openContent($event)"
      (onPreview)="preview($event)"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseCatalogContainer implements OnInit {
  private readonly courseService      = inject(CourseService);
  private readonly pathService        = inject(LearningPathService);
  private readonly enrollmentService  = inject(EnrollmentService);
  private readonly router             = inject(Router);

  readonly courses        = signal<ICourse[]>([]);
  readonly paths          = signal<ILearningPath[]>([]);
  readonly enrolledIds    = signal<string[]>([]);
  readonly enrolledPathIds = signal<string[]>([]);
  readonly isLoading      = signal(true);

  ngOnInit(): void {
    this.courseService.getCourses().subscribe(res => {
      this.courses.set(res.courses);
      this.checkLoaded();
    });

    this.pathService.getLearningPaths().subscribe(res => {
      this.paths.set(res.learningPaths);
      this.checkLoaded();
    });

    this.enrollmentService.getMyEnrollments().subscribe(enrs => {
      this.enrolledIds.set(enrs.map(e => e.courseId));
    });

    this.enrollmentService.getMyPathEnrollments().subscribe(enrs => {
      this.enrolledPathIds.set(enrs.map(e => e.learningPathId));
    });
  }

  private loaded = 0;
  private checkLoaded(): void {
    this.loaded++;
    if (this.loaded >= 2) this.isLoading.set(false);
  }

  enroll(event: ICatalogEnrollAction): void {
    // Distinguish course vs path by checking ids
    const isCourse = this.courses().some(c => c.id === event.courseId);
    if (isCourse) {
      this.enrollmentService.enrollInCourse(event.courseId).subscribe(() => {
        this.enrolledIds.update(ids => [...ids, event.courseId]);
      });
    } else {
      this.enrollmentService.enrollInPath(event.courseId).subscribe(() => {
        this.enrolledPathIds.update(ids => [...ids, event.courseId]);
      });
    }
  }

  openContent(id: string): void {
    const isCourse = this.courses().some(c => c.id === id);
    if (isCourse) {
      this.router.navigate(['/learn/courses', id]);
    } else {
      this.router.navigate(['/learn/paths', id]);
    }
  }

  preview(event: { kind: 'course' | 'path'; id: string }): void {
    if (event.kind === 'path') {
      this.router.navigate(['/learn/paths', event.id]);
    } else {
      this.router.navigate(['/learn/preview', 'courses', event.id]);
    }
  }
}
