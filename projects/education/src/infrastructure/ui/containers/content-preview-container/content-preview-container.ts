import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CourseService } from '../../../services/course.service';
import { LearningPathService } from '../../../services/learning-path.service';
import { EnrollmentService } from '../../../services/enrollment.service';
import { ContentPreviewView, TPreviewType } from '../../views/content-preview-view/content-preview-view';
import { ICourse } from '../../../../domain/model/course.model';
import { ILearningPath } from '../../../../domain/model/learning-path.model';

@Component({
  selector: 'edu-content-preview-container',
  standalone: true,
  imports: [ContentPreviewView],
  template: `
    <edu-content-preview-view
      [type]="previewType()"
      [course]="course()"
      [path]="path()"
      [isEnrolled]="isEnrolled()"
      [isLoading]="isLoading()"
      (onEnroll)="enroll()"
      (onPlay)="play()"
      (onBack)="back()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContentPreviewContainer implements OnInit {
  private readonly route              = inject(ActivatedRoute);
  private readonly router             = inject(Router);
  private readonly courseService      = inject(CourseService);
  private readonly pathService        = inject(LearningPathService);
  private readonly enrollmentService  = inject(EnrollmentService);

  readonly previewType = signal<TPreviewType>('course');
  readonly course      = signal<ICourse | null>(null);
  readonly path        = signal<ILearningPath | null>(null);
  readonly isEnrolled  = signal(false);
  readonly isLoading   = signal(true);

  ngOnInit(): void {
    const type = this.route.snapshot.data['previewType'] as TPreviewType;
    const id   = this.route.snapshot.paramMap.get('id')!;
    this.previewType.set(type);

    if (type === 'course') {
      this.courseService.getCourseById(id).subscribe(c => {
        this.course.set(c);
        this.isLoading.set(false);
      });
      this.enrollmentService.getMyEnrollments().subscribe(enrs => {
        this.isEnrolled.set(enrs.some(e => e.courseId === id));
      });
    } else {
      this.pathService.getLearningPathById(id).subscribe(p => {
        this.path.set(p);
        this.isLoading.set(false);
      });
      this.enrollmentService.getMyPathEnrollments().subscribe(enrs => {
        this.isEnrolled.set(enrs.some(e => e.learningPathId === id));
      });
    }
  }

  enroll(): void {
    const type = this.previewType();
    if (type === 'course') {
      const id = this.course()?.id;
      if (!id) return;
      this.enrollmentService.enrollInCourse(id).subscribe(() => {
        this.isEnrolled.set(true);
      });
    } else {
      const id = this.path()?.id;
      if (!id) return;
      this.enrollmentService.enrollInPath(id).subscribe(() => {
        this.isEnrolled.set(true);
      });
    }
  }

  play(): void {
    const type = this.previewType();
    if (type === 'course') {
      this.router.navigate(['/learn/courses', this.course()?.id]);
    } else {
      this.router.navigate(['/learn/paths', this.path()?.id]);
    }
  }

  back(): void {
    this.router.navigate(['/learn/catalog']);
  }
}
