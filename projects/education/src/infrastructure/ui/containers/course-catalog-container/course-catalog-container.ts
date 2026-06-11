import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { CourseService } from '../../../services/course.service';
import { LearningPathService } from '../../../services/learning-path.service';
import { EnrollmentService } from '../../../services/enrollment.service';
import { ICourse, EDifficulty, ECourseStatus } from '../../../../domain/model/course.model';
import { ILearningPath, ELearningPathStatus } from '../../../../domain/model/learning-path.model';
import { ICatalogItem } from '../../models/catalog-item.model';
import { CatalogCard } from '../../components/catalog-card/catalog-card';
import { CatalogFilterBar, TCatalogKindFilter, TCatalogLevelFilter } from '../../components/catalog-filter-bar/catalog-filter-bar';
import { DIFFICULTY_LABELS, formatDuration } from '../../utils/course-labels';
import {
  PageComponent,
  PageHeaderComponent,
  CardGridComponent,
  LoadingSkeletonComponent,
  EmptyStateComponent,
} from 'shared';

@Component({
  selector: 'edu-course-catalog-container',
  standalone: true,
  imports: [
    PageComponent,
    PageHeaderComponent,
    CardGridComponent,
    LoadingSkeletonComponent,
    EmptyStateComponent,
    CatalogCard,
    CatalogFilterBar,
  ],
  templateUrl: './course-catalog-container.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseCatalogContainer implements OnInit {
  private readonly courseService     = inject(CourseService);
  private readonly pathService       = inject(LearningPathService);
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly router            = inject(Router);

  // ── Data ────────────────────────────────────────────────────────────────────
  protected readonly courses          = signal<ICourse[]>([]);
  protected readonly paths            = signal<ILearningPath[]>([]);
  protected readonly enrolledIds      = signal<string[]>([]);
  protected readonly enrolledPathIds  = signal<string[]>([]);
  protected readonly isLoading        = signal(true);

  // ── Filter state (UI logic, no SCSS needed) ──────────────────────────────
  protected readonly search      = signal('');
  protected readonly filterKind  = signal<TCatalogKindFilter>('all');
  protected readonly filterLevel = signal<TCatalogLevelFilter>('all');

  // ── Derived ─────────────────────────────────────────────────────────────────
  protected readonly allItems = computed<ICatalogItem[]>(() => {
    const courseItems: ICatalogItem[] = this.courses()
      .filter(c => c.status === ECourseStatus.PUBLISHED)
      .map(c => ({
        kind: 'course' as const,
        id: c.id,
        title: c.title,
        description: c.description,
        thumbnailUrl: c.thumbnailUrl,
        tags: c.tags,
        duration: c.totalDuration,
        difficulty: c.difficulty,
        meta: `${c.totalLessons} lecciones · ${DIFFICULTY_LABELS[c.difficulty] ?? ''}`,
      }));

    const pathItems: ICatalogItem[] = this.paths()
      .filter(p => p.status === ELearningPathStatus.PUBLISHED)
      .map(p => ({
        kind: 'path' as const,
        id: p.id,
        title: p.title,
        description: p.description,
        thumbnailUrl: p.thumbnailUrl,
        tags: p.tags,
        duration: p.estimatedDuration,
        meta: `${p.steps.length} curso(s) · ${p.enrolledCount} inscritos`,
      }));

    return [...courseItems, ...pathItems];
  });

  protected readonly filtered = computed(() => {
    const q    = this.search().toLowerCase();
    const lvl  = this.filterLevel();
    const kind = this.filterKind();
    return this.allItems().filter(item => {
      if (kind !== 'all' && item.kind !== kind) return false;
      if (q && !item.title.toLowerCase().includes(q) && !item.description.toLowerCase().includes(q)) return false;
      if (lvl !== 'all' && item.difficulty !== lvl) return false;
      return true;
    });
  });

  protected isEnrolled(item: ICatalogItem): boolean {
    return item.kind === 'course'
      ? this.enrolledIds().includes(item.id)
      : this.enrolledPathIds().includes(item.id);
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  private loaded = 0;

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

  private checkLoaded(): void {
    this.loaded++;
    if (this.loaded >= 2) this.isLoading.set(false);
  }

  // ── Actions ──────────────────────────────────────────────────────────────────
  protected enroll(item: ICatalogItem): void {
    if (item.kind === 'course') {
      this.enrollmentService.enrollInCourse(item.id).subscribe(() => {
        this.enrolledIds.update(ids => [...ids, item.id]);
      });
    } else {
      this.enrollmentService.enrollInPath(item.id).subscribe(() => {
        this.enrolledPathIds.update(ids => [...ids, item.id]);
      });
    }
  }

  protected open(item: ICatalogItem): void {
    if (item.kind === 'course') {
      this.router.navigate(['/learn/courses', item.id]);
    } else {
      this.router.navigate(['/learn/paths', item.id]);
    }
  }

  protected preview(item: ICatalogItem): void {
    if (item.kind === 'path') {
      this.router.navigate(['/learn/paths', item.id]);
    } else {
      this.router.navigate(['/learn/preview', 'courses', item.id]);
    }
  }
}
