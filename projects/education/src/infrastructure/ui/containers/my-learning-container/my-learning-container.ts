import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { LoadingSkeletonComponent, PaginationComponent } from 'shared';
import { MyLearningUseCase, ICertification } from '../../../../application/my-learning.usecase';
import { IEnrolledCourseEntry, IEnrolledPathEntry } from '../../../../domain/model/enrollment.model';
import { ICourseCertificate } from '../../../../domain/model/player.model';
import { CourseProgressCard } from '../../components/course-progress-card/course-progress-card';
import { CourseCertificate } from '../../components/course-certificate/course-certificate';

const PAGE_SIZE      = 4;
const PATH_PAGE_SIZE = 6;

@Component({
  selector: 'edu-my-learning-container',
  standalone: true,
  imports: [
    LoadingSkeletonComponent, PaginationComponent, CourseProgressCard,
    CourseCertificate, DecimalPipe, RouterLink,
  ],
  templateUrl: './my-learning-container.html',
  styleUrl: './my-learning-container.scss',
})
export class MyLearningContainer implements OnInit {
  private readonly router = inject(Router);
  protected readonly uc   = inject(MyLearningUseCase);

  protected readonly viewingCertificate = signal<ICourseCertificate | null>(null);

  readonly today = new Date();

  protected readonly courseSearch = signal('');
  protected readonly coursePage   = signal(1);

  protected readonly pathSearch = signal('');
  protected readonly pathPage   = signal(1);

  protected readonly certSearch = signal('');
  protected readonly certPage   = signal(1);

  /* ── Courses ── */

  protected readonly filteredCourses = computed(() => {
    const q = this.courseSearch().toLowerCase().trim();
    if (!q) return this.uc.enrolledCourses();
    return this.uc.enrolledCourses().filter(e =>
      e.course.title.toLowerCase().includes(q) ||
      (e.course.instructorName ?? '').toLowerCase().includes(q)
    );
  });

  protected readonly courseTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredCourses().length / PAGE_SIZE))
  );

  protected readonly pagedCourses = computed(() => {
    const page = this.coursePage();
    return this.filteredCourses().slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  });

  /* ── Paths ── */

  protected readonly filteredPaths = computed(() => {
    const q = this.pathSearch().toLowerCase().trim();
    if (!q) return this.uc.enrolledPaths();
    return this.uc.enrolledPaths().filter(e =>
      e.path.title.toLowerCase().includes(q) ||
      e.path.description.toLowerCase().includes(q)
    );
  });

  protected readonly pathTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredPaths().length / PATH_PAGE_SIZE))
  );

  protected readonly pagedPaths = computed(() => {
    const page = this.pathPage();
    return this.filteredPaths().slice((page - 1) * PATH_PAGE_SIZE, page * PATH_PAGE_SIZE);
  });

  /* ── Certifications ── */

  protected readonly filteredCerts = computed(() => {
    const q = this.certSearch().toLowerCase().trim();
    if (!q) return this.uc.certifications();
    return this.uc.certifications().filter(c =>
      c.resourceTitle.toLowerCase().includes(q)
    );
  });

  protected readonly certTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredCerts().length / PAGE_SIZE))
  );

  protected readonly pagedCerts = computed(() => {
    const page = this.certPage();
    return this.filteredCerts().slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  });

  ngOnInit(): void { this.uc.load(); }

  protected continueCourse(entry: IEnrolledCourseEntry): void {
    this.router.navigate(['/learn/courses', entry.course.id]);
  }

  protected openPath(entry: IEnrolledPathEntry): void {
    this.router.navigate(['/learn/preview', 'paths', entry.path.id]);
  }

  protected openCertificate(cert: ICertification): void {
    this.viewingCertificate.set(this.uc.buildCertificate(cert));
  }

  protected closeCertificate(): void {
    this.viewingCertificate.set(null);
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
