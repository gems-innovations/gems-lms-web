import { Injectable, inject, signal, computed } from '@angular/core';
import { ToastService } from 'shared';
import { forkJoin, catchError, of } from 'rxjs';
import { CourseService, EnrollmentService, GroupService, ReviewService, GradebookService, EContentType } from 'education';
import type { ICourse, IGroup, IGradebook } from 'education';
import type {
  ICourseStats, IEnrollmentRow, ISubmissionRow, IAssignmentEntry,
  IGradeSubmitEvent, TCourseDetailTab, IStudentGradeRow, IGradebookStudentRow,
} from '../domain/model/instructor.model';
import type { IStudentReview } from '../domain/model/review.model';

@Injectable()
export class CourseDetailUseCase {
  private readonly courseService     = inject(CourseService);
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly groupService      = inject(GroupService);
  private readonly reviewService     = inject(ReviewService);
  private readonly gradebookService  = inject(GradebookService);
  private readonly toast             = inject(ToastService);

  private readonly _course      = signal<ICourse | null>(null);
  private readonly _courseId    = signal<string>('');
  private readonly _group       = signal<IGroup | null>(null);
  private readonly _enrollments = signal<IEnrollmentRow[]>([]);
  private readonly _submissions = signal<ISubmissionRow[]>([]);
  private readonly _isLoading   = signal(true);

  readonly group = this._group.asReadonly();

  // Libro de calificaciones: se pide al abrir la pestaña y se recalcula al calificar.
  private readonly _gradebook        = signal<IGradebook | null>(null);
  private readonly _gradebookLoading = signal(false);
  private readonly _gradebookError   = signal<string | null>(null);
  readonly gradebook        = this._gradebook.asReadonly();
  readonly gradebookLoading = this._gradebookLoading.asReadonly();
  readonly gradebookError   = this._gradebookError.asReadonly();

  /** Filas de los estudiantes visibles (el grupo actual), con su perfil. */
  readonly gradebookRows = computed<IGradebookStudentRow[]>(() => {
    const book = this._gradebook();
    if (!book) return [];
    const students = new Map(this._enrollments().map(e => [e.student.id, e.student]));
    return book.rows
      .filter(r => students.has(r.studentId))
      .map(r => ({ ...r, student: students.get(r.studentId)! }))
      .sort((a, b) => `${a.student.lastName} ${a.student.firstName}`.localeCompare(`${b.student.lastName} ${b.student.firstName}`));
  });

  // Reseñas de estudiantes de ESTE curso (feedback independiente por curso).
  private readonly _reviews = signal<IStudentReview[]>([]);
  readonly reviews = this._reviews.asReadonly();

  private readonly _activeTab        = signal<TCourseDetailTab>('overview');
  private readonly _selectedBlockId  = signal<string | null>(null);
  private readonly _selectedSubId    = signal<string | null>(null);
  private readonly _selectedStudentId = signal<string | null>(null);

  readonly isLoading   = this._isLoading.asReadonly();
  readonly course      = this._course.asReadonly();
  readonly enrollments = this._enrollments.asReadonly();
  readonly submissions = this._submissions.asReadonly();
  readonly activeTab   = this._activeTab.asReadonly();

  readonly stats = computed<ICourseStats>(() => {
    const enr = this._enrollments();
    const sub = this._submissions();
    const graded = sub.filter(s => s.grade != null);
    return {
      studentCount: enr.length,
      avgProgress: enr.length
        ? Math.round(enr.reduce((a, e) => a + (e.progress?.overallPercentage ?? 0), 0) / enr.length)
        : 0,
      avgGrade: graded.length
        ? Math.round(graded.reduce((a, s) => a + (s.grade ?? 0), 0) / graded.length)
        : null,
      pendingCount: sub.filter(s => s.status === 'pending').length,
    };
  });

  readonly assignments = computed<IAssignmentEntry[]>(() => {
    const course = this._course();
    if (!course) return [];
    const subs = this._submissions();
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

  readonly selectedAssignment = computed(() =>
    this.assignments().find(a => a.block.id === this._selectedBlockId()) ?? null
  );

  readonly blockSubmissions = computed(() =>
    this._submissions().filter(s => s.blockId === this._selectedBlockId())
  );

  readonly selectedSubmission = computed(() =>
    this.blockSubmissions().find(s => s.id === this._selectedSubId()) ?? null
  );

  // ── Inscritos que NO entregaron la evaluación seleccionada (seguimiento) ────
  readonly nonSubmitters = computed<IEnrollmentRow[]>(() => {
    const blockId = this._selectedBlockId();
    if (!blockId) return [];
    const submitted = new Set(this.blockSubmissions().map(s => s.student.id));
    return this._enrollments().filter(e => !submitted.has(e.student.id));
  });

  // ── Drill-in de estudiante (notas + radar vs promedio del grupo) ────────────
  readonly selectedStudent = computed<IEnrollmentRow | null>(() =>
    this._enrollments().find(e => e.student.id === this._selectedStudentId()) ?? null
  );

  readonly studentGradeRows = computed<IStudentGradeRow[]>(() => {
    const sid = this._selectedStudentId();
    return this.assignments().map(a => {
      const sub = this._submissions().find(s => s.blockId === a.block.id && s.student.id === sid);
      const blockGraded = this._submissions().filter(s => s.blockId === a.block.id && s.grade != null);
      const groupAvg = blockGraded.length
        ? Math.round(blockGraded.reduce((x, s) => x + (s.grade ?? 0), 0) / blockGraded.length)
        : null;
      return {
        blockId: a.block.id,
        title: a.block.title,
        grade: sub?.grade ?? null,
        groupAvg,
        status: sub?.status ?? 'missing',
      };
    });
  });

  // Solo evaluaciones con promedio de grupo (calificadas) para el radar.
  readonly studentRadar = computed(() => {
    const rows = this.studentGradeRows().filter(r => r.groupAvg != null);
    return {
      axes: rows.map(r => r.title),
      studentValues: rows.map(r => r.grade ?? 0),
      groupValues: rows.map(r => r.groupAvg ?? 0),
    };
  });

  init(courseId: string, groupId?: string): void {
    this._courseId.set(courseId);
    this._isLoading.set(true);
    forkJoin({
      course:      this.courseService.getCourseById(courseId),
      group:       this.groupService.getGroup(groupId ?? ''),
      enrollments: this.enrollmentService.getEnrollmentsByCourse(courseId),
      submissions: this.enrollmentService.getAllSubmissions(),
      reviews:     this.reviewService.getReviews(courseId).pipe(catchError(() => of([]))),
    }).subscribe(({ course, group, enrollments, submissions, reviews }) => {
      this._course.set(course ?? null);
      this._group.set(group);
      // Filtra a los estudiantes del grupo/cohorte (si aplica).
      const studentSet = group ? new Set(group.studentIds) : null;
      this._enrollments.set(
        (enrollments as IEnrollmentRow[]).filter(e => !studentSet || studentSet.has(e.student.id))
      );
      this._submissions.set(
        (submissions as ISubmissionRow[]).filter(s =>
          s.courseId === courseId && (!studentSet || studentSet.has(s.student.id))
        )
      );
      const names = new Map((enrollments as IEnrollmentRow[])
        .map(e => [e.student.id, `${e.student.firstName} ${e.student.lastName}`]));
      this._reviews.set(reviews.map(r => ({
        id: r.id,
        courseId: r.courseId,
        courseTitle: course?.title ?? '',
        studentName: names.get(r.studentId) ?? 'Estudiante',
        rating: r.rating,
        comment: r.comment,
        createdAt: r.updatedAt,
      })));
      this._isLoading.set(false);
    });
  }

  setActiveTab(tab: TCourseDetailTab): void {
    this._activeTab.set(tab);
    if (tab === 'gradebook') this.loadGradebook();
    this._selectedBlockId.set(null);
    this._selectedSubId.set(null);
    this._selectedStudentId.set(null);
  }

  selectStudent(studentId: string): void { this._selectedStudentId.set(studentId); }
  clearStudent(): void { this._selectedStudentId.set(null); }

  openAssignment(blockId: string): void {
    this._selectedBlockId.set(blockId);
    this._selectedSubId.set(null);
  }

  backToAssignments(): void {
    this._selectedBlockId.set(null);
    this._selectedSubId.set(null);
  }

  /** Desde el libro de calificaciones: abre la entrega del estudiante en la pestaña Entregas. */
  openStudentSubmission(blockId: string, studentId: string): void {
    const sub = this._submissions().find(s => s.blockId === blockId && s.student.id === studentId);
    this._activeTab.set('submissions');
    this._selectedBlockId.set(blockId);
    this._selectedSubId.set(sub?.id ?? null);
  }

  openSubmission(sub: ISubmissionRow): void { this._selectedSubId.set(sub.id); }
  backToSubmissionList(): void { this._selectedSubId.set(null); }

  grade(event: IGradeSubmitEvent): void {
    this.enrollmentService.gradeSubmission(event.submissionId, event.grade, event.feedback, event.rubricScores)
      .subscribe({
        next: updated => {
          this._submissions.update(list =>
            list.map(s => s.id === updated.id ? { ...s, ...updated } : s)
          );
          this.backToSubmissionList();
          if (this._gradebook()) this.loadGradebook();
        },
        error: err => this.toast.error(err?.error?.code === 'PERIOD_CLOSED'
          ? 'El período académico de este curso está cerrado: las notas ya quedaron en el acta.'
          : 'No se pudo guardar la calificación. Intenta de nuevo.'),
      });
  }

  loadGradebook(): void {
    const courseId = this._courseId();
    if (!courseId) return;
    this._gradebookLoading.set(true);
    this._gradebookError.set(null);
    this.gradebookService.course(courseId).subscribe({
      next: book => { this._gradebook.set(book); this._gradebookLoading.set(false); },
      error: () => { this._gradebookError.set('No se pudo cargar el libro de calificaciones'); this._gradebookLoading.set(false); },
    });
  }

  /** Guarda los pesos (blockId → 0-100) y muestra las notas recalculadas. */
  saveWeights(weights: Record<string, number>): void {
    this._gradebookError.set(null);
    this.gradebookService.saveWeights(this._courseId(), weights).subscribe({
      next: book => this._gradebook.set(book),
      error: err => this._gradebookError.set(err?.error?.code === 'PERIOD_CLOSED'
        ? 'El período está cerrado: las ponderaciones ya no se pueden cambiar.'
        : 'No se pudieron guardar los pesos'),
    });
  }
}
