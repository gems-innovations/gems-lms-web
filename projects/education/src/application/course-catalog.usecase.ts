import { inject, Injectable, signal, computed, DestroyRef, effect } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, forkJoin, EMPTY } from 'rxjs';
import { tap, switchMap, catchError } from 'rxjs/operators';
import { CourseService } from '../infrastructure/services/course.service';
import { LearningPathService } from '../infrastructure/services/learning-path.service';
import { EnrollmentService } from '../infrastructure/services/enrollment.service';
import { ECourseStatus } from '../domain/model/course.model';
import { ELearningPathStatus } from '../domain/model/learning-path.model';
import { ICatalogItem, TCatalogKindFilter, TCatalogLevelFilter } from '../domain/model/catalog.model';
import { DIFFICULTY_LABELS } from '../infrastructure/ui/utils/course-labels';

const CATALOG_PAGE_SIZE = 9;

@Injectable({ providedIn: 'root' })
export class CourseCatalogUseCase {
  private readonly destroyRef        = inject(DestroyRef);
  private readonly courseService     = inject(CourseService);
  private readonly pathService       = inject(LearningPathService);
  private readonly enrollmentService = inject(EnrollmentService);

  //#region State
  private readonly _allItems        = signal<ICatalogItem[]>([]);
  private readonly _enrolledIds     = signal<string[]>([]);
  private readonly _enrolledPathIds = signal<string[]>([]);
  private readonly _isLoading       = signal(true);
  private readonly _search          = signal('');
  private readonly _filterKind      = signal<TCatalogKindFilter>('all');
  private readonly _filterLevel     = signal<TCatalogLevelFilter>('all');
  private readonly _page            = signal(1);

  readonly isLoading   = computed(() => this._isLoading());
  readonly search      = computed(() => this._search());
  readonly filterKind  = computed(() => this._filterKind());
  readonly filterLevel = computed(() => this._filterLevel());
  readonly page        = computed(() => this._page());

  readonly filtered = computed(() => {
    const q    = this._search().toLowerCase();
    const lvl  = this._filterLevel();
    const kind = this._filterKind();
    return this._allItems().filter(item => {
      if (kind !== 'all' && item.kind !== kind) return false;
      if (q && !item.title.toLowerCase().includes(q) && !item.description.toLowerCase().includes(q)) return false;
      if (lvl !== 'all' && item.difficulty !== lvl) return false;
      return true;
    });
  });

  readonly totalCount  = computed(() => this.filtered().length);
  readonly totalPages  = computed(() => Math.max(1, Math.ceil(this.filtered().length / CATALOG_PAGE_SIZE)));
  readonly pagedItems  = computed(() => {
    const p = this._page();
    return this.filtered().slice((p - 1) * CATALOG_PAGE_SIZE, p * CATALOG_PAGE_SIZE);
  });
  //#endregion

  //#region Action subjects
  private readonly load$ = new Subject<void>();
  private readonly enroll$ = new Subject<ICatalogItem>();
  //#endregion

  constructor() {
    effect(() => {
      this._search();
      this._filterKind();
      this._filterLevel();
      this._page.set(1);
    }, { allowSignalWrites: true });

    this.load$.pipe(
      tap(() => this._isLoading.set(true)),
      switchMap(() => forkJoin({
        courses: this.courseService.getCourses(),
        paths: this.pathService.getLearningPaths(),
        enrollments: this.enrollmentService.getMyEnrollments(),
        pathEnrollments: this.enrollmentService.getMyPathEnrollments(),
      }).pipe(
        tap(({ courses, paths, enrollments, pathEnrollments }) => {
          const courseItems: ICatalogItem[] = courses.courses
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

          const pathItems: ICatalogItem[] = paths.learningPaths
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

          this._allItems.set([...courseItems, ...pathItems]);
          this._enrolledIds.set(enrollments.map(e => e.courseId));
          this._enrolledPathIds.set(pathEnrollments.map(e => e.learningPathId));
          this._isLoading.set(false);
        }),
        catchError(() => { this._isLoading.set(false); return EMPTY; })
      )),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    this.enroll$.pipe(
      switchMap(item => item.kind === 'course'
        ? this.enrollmentService.enrollInCourse(item.id).pipe(
            tap(() => this._enrolledIds.update(ids => [...ids, item.id])),
            catchError(() => EMPTY)
          )
        : this.enrollmentService.enrollInPath(item.id).pipe(
            tap(() => this._enrolledPathIds.update(ids => [...ids, item.id])),
            catchError(() => EMPTY)
          )
      ),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }

  //#region Public API
  load(): void { this.load$.next(); }

  setSearch(q: string): void { this._search.set(q); }
  setFilterKind(kind: TCatalogKindFilter): void { this._filterKind.set(kind); }
  setFilterLevel(level: TCatalogLevelFilter): void { this._filterLevel.set(level); }
  setPage(p: number): void { this._page.set(p); }
  prevPage(): void { this._page.update(p => Math.max(1, p - 1)); }
  nextPage(): void { this._page.update(p => Math.min(this.totalPages(), p + 1)); }

  isEnrolled(item: ICatalogItem): boolean {
    return item.kind === 'course'
      ? this._enrolledIds().includes(item.id)
      : this._enrolledPathIds().includes(item.id);
  }

  enroll(item: ICatalogItem): void { this.enroll$.next(item); }
  //#endregion
}
