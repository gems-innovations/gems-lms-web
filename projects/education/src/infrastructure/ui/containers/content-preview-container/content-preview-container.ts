import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CourseService } from '../../../services/course.service';
import { LearningPathService } from '../../../services/learning-path.service';
import { EnrollmentService } from '../../../services/enrollment.service';
import { ICourse } from '../../../../domain/model/course.model';
import { ILearningPath } from '../../../../domain/model/learning-path.model';
import { LoadingSkeletonComponent } from 'shared';
import { PreviewHero, TPreviewType } from '../../components/preview-hero/preview-hero';
import { PreviewCourseOutline } from '../../components/preview-course-outline/preview-course-outline';
import { PreviewPathSequence } from '../../components/preview-path-sequence/preview-path-sequence';

@Component({
  selector: 'edu-content-preview-container',
  standalone: true,
  imports: [LoadingSkeletonComponent, PreviewHero, PreviewCourseOutline, PreviewPathSequence],
  templateUrl: './content-preview-container.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContentPreviewContainer implements OnInit {
  private readonly route             = inject(ActivatedRoute);
  private readonly router            = inject(Router);
  private readonly courseService     = inject(CourseService);
  private readonly pathService       = inject(LearningPathService);
  private readonly enrollmentService = inject(EnrollmentService);

  protected readonly previewType = signal<TPreviewType>('course');
  protected readonly course      = signal<ICourse | null>(null);
  protected readonly path        = signal<ILearningPath | null>(null);
  protected readonly isEnrolled  = signal(false);
  protected readonly isLoading   = signal(true);

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

  protected enroll(): void {
    if (this.previewType() === 'course') {
      const id = this.course()?.id;
      if (!id) return;
      this.enrollmentService.enrollInCourse(id).subscribe(() => this.isEnrolled.set(true));
    } else {
      const id = this.path()?.id;
      if (!id) return;
      this.enrollmentService.enrollInPath(id).subscribe(() => this.isEnrolled.set(true));
    }
  }

  protected play(): void {
    if (this.previewType() === 'course') {
      this.router.navigate(['/learn/courses', this.course()?.id]);
    } else {
      this.router.navigate(['/learn/paths', this.path()?.id]);
    }
  }

  protected back(): void { this.router.navigate(['/learn/catalog']); }
}
