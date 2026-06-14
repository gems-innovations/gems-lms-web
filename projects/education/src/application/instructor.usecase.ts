import { inject, Injectable, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, EMPTY } from 'rxjs';
import { switchMap, tap, catchError } from 'rxjs/operators';
import { CourseService } from '../infrastructure/services/course.service';
import { EnrollmentService, IStudentProfile } from '../infrastructure/services/enrollment.service';
import { NotificationService, IInstructorNotification } from '../infrastructure/services/notification.service';
import { ICourse, EContentType } from '../domain/model/course.model';
import {
  TInstructorTab, ICourseStats, IAssignmentEntry,
  IEnrollmentRow, ISubmissionRow, IGradeSubmitEvent
} from '../domain/model/instructor.model';

@Injectable({ providedIn: 'root' })
export class InstructorUseCase {
  private readonly destroyRef        = inject(DestroyRef);
  private readonly courseService     = inject(CourseService);
  private readonly enrollmentService = inject(EnrollmentService);
  readonly notifService              = inject(NotificationService);

  //#region State
  private readonly _courses     = signal<ICourse[]>([]);
  private readonly _enrollments = signal<IEnrollmentRow[]>([]);
  private readonly _submissions = signal<ISubmissionRow[]>([]);
  private readonly _isLoading   = signal(true);

  private readonly _selectedCourseId = signal<string | null>(null);
  private readonly _selectedBlockId  = signal<string | null>(null);
  private readonly _activeTab        = signal<TInstructorTab>('students');
  private readonly _submissionPage   = signal(0);
  private readonly _selectedSubId    = signal<string | null>(null);

  readonly PAGE_SIZE = 5;

  readonly courses     = computed(() => this._courses());
  readonly isLoading   = computed(() => this._isLoading());
  readonly activeTab   = computed(() => this._activeTab());
  readonly submissionPage = computed(() => this._submissionPage());

  readonly selectedCourse = computed(() =>
    this._courses().find(c => c.id === this._selectedCourseId()) ?? null
  );

  readonly courseEnrollments = computed(() =>
    this._enrollments().filter(e => e.courseId === this._selectedCourseId())
  );

  readonly courseSubmissions = computed(() =>
    this._submissions().filter(s => s.courseId === this._selectedCourseId())
  );

  readonly courseAssignments = computed<IAssignmentEntry[]>(() => {
    const course = this.selectedCourse();
    if (!course) return [];
    const subs = this.courseSubmissions();
    const entries: IAssignmentEntry[] = [];
    for (const mod of course.modules ?? []) {
      for (const lesson of mod.lessons ?? []) {
        for (const block of lesson.contentBlocks ?? []) {
          if (block.type !== EContentType.ASSIGNMENT && block.type !== EContentType.QUIZ) continue;
          const blockSubs = subs.filter(s => s.blockId === block.id);
          entries.push({
            block, lessonTitle: lesson.title, moduleTitle: mod.title,
            submittedCount: blockSubs.length,
            pendingCount: blockSubs.filter(s => s.status === 'pending').length,
            gradedCount: blockSubs.filter(s => s.status !== 'pending').length,
          });
        }
      }
    }
    return entries;
  });

  readonly courseStats = computed<ICourseStats>(() => this.statsFor(this._selectedCourseId() ?? ''));

  readonly selectedAssignment = computed(() =>
    this.courseAssignments().find(a => a.block.id === this._selectedBlockId()) ?? null
  );

  readonly blockSubmissions = computed(() =>
    this.courseSubmissions().filter(s => s.blockId === this._selectedBlockId())
  );

  readonly pagedSubmissions = computed(() => {
    const page = this._submissionPage();
    return this.blockSubmissions().slice(page * this.PAGE_SIZE, (page + 1) * this.PAGE_SIZE);
  });

  readonly selectedSubmission = computed(() =>
    this.blockSubmissions().find(s => s.id === this._selectedSubId()) ?? null
  );

  readonly headerTitle = computed(() => {
    const assignment = this.selectedAssignment();
    const course = this.selectedCourse();
    if (assignment) return assignment.block.title;
    if (course) return course.title;
    return 'Panel Instructor';
  });

  readonly headerSubtitle = computed(() => {
    const assignment = this.selectedAssignment();
    const course = this.selectedCourse();
    if (assignment) return `${assignment.moduleTitle} · ${assignment.lessonTitle}`;
    if (course) return 'Estudiantes, evaluaciones y calificaciones de este curso.';
    return 'Selecciona un curso para ver sus estudiantes, evaluaciones y entregas.';
  });
  //#endregion

  //#region Action subjects
  private readonly grade$ = new Subject<IGradeSubmitEvent>();
  //#endregion

  constructor() {
    this.grade$.pipe(
      switchMap(event =>
        this.enrollmentService.gradeSubmission(event.submissionId, event.grade, event.feedback).pipe(
          tap(updated => {
            this._submissions.update(list =>
              list.map(s => s.id === updated.id ? { ...s, ...updated } : s)
            );
            this.backToSubmissionList();
          }),
          catchError(() => EMPTY)
        )
      ),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }

  //#region Public API — load
  load(): void {
    this._isLoading.set(true);
    this.courseService.getCourses().subscribe(res => {
      this._courses.set(res.courses);
    });
    this.enrollmentService.getAllCourseEnrollments().subscribe(rows => {
      this._enrollments.set(rows as IEnrollmentRow[]);
      this._isLoading.set(false);
    });
    this.enrollmentService.getAllSubmissions().subscribe(rows => {
      this._submissions.set(rows as ISubmissionRow[]);
    });
  }
  //#endregion

  //#region Public API — navigation
  openCourse(courseId: string): void {
    this._selectedCourseId.set(courseId);
    this._selectedBlockId.set(null);
    this._activeTab.set('students');
    this._selectedSubId.set(null);
  }

  backToCourses(): void {
    this._selectedCourseId.set(null);
    this._selectedBlockId.set(null);
    this._selectedSubId.set(null);
  }

  openAssignment(blockId: string): void {
    this._selectedBlockId.set(blockId);
    this._selectedSubId.set(null);
    this._submissionPage.set(0);
  }

  backToAssignments(): void {
    this._selectedBlockId.set(null);
    this._selectedSubId.set(null);
  }

  openSubmission(sub: ISubmissionRow): void {
    this._selectedSubId.set(sub.id);
  }

  backToSubmissionList(): void {
    this._selectedSubId.set(null);
  }

  setActiveTab(tab: TInstructorTab): void {
    this._activeTab.set(tab);
  }

  setSubmissionPage(page: number): void {
    this._submissionPage.set(page);
  }

  handleNotification(n: IInstructorNotification): void {
    this._selectedCourseId.set(n.courseId);
    this._activeTab.set('assignments');
    const sub = this._submissions().find(s => s.id === n.submissionId);
    this._selectedBlockId.set(sub?.blockId ?? null);
  }

  grade(event: IGradeSubmitEvent): void {
    this.grade$.next(event);
  }

  statsFor(courseId: string): ICourseStats {
    const enr = this._enrollments().filter(e => e.courseId === courseId);
    const sub = this._submissions().filter(s => s.courseId === courseId);
    const graded = sub.filter(s => s.grade != null);
    return {
      studentCount: enr.length,
      avgProgress: enr.length
        ? Math.round(enr.reduce((acc, e) => acc + (e.progress?.overallPercentage ?? 0), 0) / enr.length)
        : 0,
      avgGrade: graded.length
        ? Math.round(graded.reduce((acc, s) => acc + (s.grade ?? 0), 0) / graded.length)
        : null,
      pendingCount: sub.filter(s => s.status === 'pending').length,
    };
  }
  //#endregion
}
