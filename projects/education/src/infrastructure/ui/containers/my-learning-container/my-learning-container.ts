import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { LoadingSkeletonComponent, EmptyStateComponent } from 'shared';
import { MyLearningUseCase } from '../../../../application/my-learning.usecase';
import { IEnrolledCourseEntry, IEnrolledPathEntry } from '../../../../domain/model/enrollment.model';
import { CourseProgressCard } from '../../components/course-progress-card/course-progress-card';

@Component({
  selector: 'edu-my-learning-container',
  standalone: true,
  imports: [LoadingSkeletonComponent, EmptyStateComponent, CourseProgressCard, DecimalPipe, RouterLink],
  templateUrl: './my-learning-container.html',
  styleUrl: './my-learning-container.scss',
})
export class MyLearningContainer implements OnInit {
  private readonly router = inject(Router);
  protected readonly uc   = inject(MyLearningUseCase);

  readonly today = new Date();

  protected readonly courseSearch = signal('');
  protected readonly pathSearch   = signal('');

  protected readonly filteredCourses = computed(() => {
    const q = this.courseSearch().toLowerCase().trim();
    if (!q) return this.uc.enrolledCourses();
    return this.uc.enrolledCourses().filter(e =>
      e.course.title.toLowerCase().includes(q) ||
      (e.course.instructorName ?? '').toLowerCase().includes(q)
    );
  });

  protected readonly filteredInProgress = computed(() =>
    this.filteredCourses().filter(e => e.enrollment.status === 'active')
  );

  protected readonly filteredCompleted = computed(() =>
    this.filteredCourses().filter(e => e.enrollment.status === 'completed')
  );

  protected readonly filteredPaths = computed(() => {
    const q = this.pathSearch().toLowerCase().trim();
    if (!q) return this.uc.enrolledPaths();
    return this.uc.enrolledPaths().filter(e =>
      e.path.title.toLowerCase().includes(q) ||
      e.path.description.toLowerCase().includes(q)
    );
  });

  ngOnInit(): void { this.uc.load(); }

  protected continueCourse(entry: IEnrolledCourseEntry): void {
    this.router.navigate(['/learn/courses', entry.course.id]);
  }

  protected openPath(entry: IEnrolledPathEntry): void {
    this.router.navigate(['/learn/paths', entry.path.id]);
  }

  protected daysUntil(date: Date): number {
    return Math.ceil((date.getTime() - this.today.getTime()) / (1000 * 60 * 60 * 24));
  }

  protected formatDate(date: Date): string {
    return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  }

  protected calDay(date: Date): string {
    return date.getDate().toString();
  }

  protected calMonth(date: Date): string {
    return date.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '');
  }
}
