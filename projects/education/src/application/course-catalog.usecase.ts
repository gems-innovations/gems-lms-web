import { inject, Injectable, signal, computed, DestroyRef, effect } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, forkJoin, EMPTY } from 'rxjs';
import { tap, switchMap, catchError } from 'rxjs/operators';
import { CourseService } from '../infrastructure/services/course.service';
import { LearningPathService } from '../infrastructure/services/learning-path.service';
import { EnrollmentService } from '../infrastructure/services/enrollment.service';
import { EnrollmentRulesService, enrollmentBlockText } from '../infrastructure/services/enrollment-rules.service';
import type { IEligibility } from '../infrastructure/services/enrollment-rules.service';
import { ToastService } from 'shared';
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
  private readonly rulesService      = inject(EnrollmentRulesService);
  private readonly toast             = inject(ToastService);

  //#region State
  private readonly _allItems        = signal<ICatalogItem[]>([]);
  private readonly _enrolledIds     = signal<string[]>([]);
  private readonly _enrolledPathIds = signal<string[]>([]);
  private readonly _isLoading       = signal(true);
  private readonly _loadError       = signal(false);
  private readonly _search          = signal('');
  private readonly _filterKind      = signal<TCatalogKindFilter>('all');
  private readonly _filterLevel     = signal<TCatalogLevelFilter>('all');
  private readonly _page            = signal(1);
  /** Enrollment window, seats and blocks of each course, for the signed-in student. */
  private readonly _eligibility     = signal<Record<string, IEligibility>>({});

  readonly isLoading   = computed(() => this._isLoading());
  readonly loadError   = this._loadError.asReadonly();
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
    });

    this.load$.pipe(
      tap(() => { this._isLoading.set(true); this._loadError.set(false); }),
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
          this._loadError.set(false);
          this._enrolledIds.set(enrollments.map(e => e.courseId));
          this._enrolledPathIds.set(pathEnrollments.map(e => e.learningPathId));
          this._isLoading.set(false);
          this.loadEligibility(courseItems.map(c => c.id).filter(id => !this._enrolledIds().includes(id)));
        }),
        catchError(() => { this._isLoading.set(false); this._loadError.set(true); return EMPTY; })
      )),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    this.enroll$.pipe(
      switchMap(item => item.kind === 'course'
        ? this.enrollmentService.enrollInCourse(item.id).pipe(
            tap(() => this._enrolledIds.update(ids => [...ids, item.id])),
            catchError(err => {
              this.toast.error(err?.message || 'No se pudo completar la inscripción');
              this.loadEligibility([item.id]);
              return EMPTY;
            })
          )
        : this.enrollmentService.enrollInPath(item.id).pipe(
            tap(() => this._enrolledPathIds.update(ids => [...ids, item.id])),
            catchError(() => { this.toast.error('No se pudo completar la inscripción en la ruta'); return EMPTY; })
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

  /** Why the student cannot enroll in this course now; null when they can (or it is a path). */
  blockedReason(item: ICatalogItem): string | null {
    if (item.kind !== 'course') return null;
    const e = this._eligibility()[item.id];
    return e && !e.allowed ? e.reasons.map(enrollmentBlockText).join('. ') : null;
  }

  /** Seats left, when the course has a capacity. */
  seatsLeft(item: ICatalogItem): number | null {
    return item.kind === 'course' ? this._eligibility()[item.id]?.seatsLeft ?? null : null;
  }

  private loadEligibility(courseIds: string[]): void {
    for (let i = 0; i < courseIds.length; i += 100) {
      this.rulesService.eligibility(courseIds.slice(i, i + 100)).subscribe({
        next: list => this._eligibility.update(m => ({ ...m, ...Object.fromEntries(list.map(e => [e.courseId, e])) })),
        error: () => {},
      });
    }
  }
  //#endregion
}
