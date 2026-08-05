import { Injectable, inject, signal, computed } from '@angular/core';
import { forkJoin } from 'rxjs';
import { CourseService, EnrollmentService, GroupService, EContentType } from 'education';
import type { ICourse, IGroup } from 'education';
import type {
  ICourseStats, IEnrollmentRow, ISubmissionRow, IAssignmentEntry,
  IGradeSubmitEvent, TCourseDetailTab, IStudentGradeRow,
} from '../domain/model/instructor.model';
import { MOCK_REVIEWS } from '../domain/model/review.model';

@Injectable()
export class CourseDetailUseCase {
  private readonly courseService     = inject(CourseService);
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly groupService      = inject(GroupService);

  private readonly _course      = signal<ICourse | null>(null);
  private readonly _courseId    = signal<string>('');
  private readonly _group       = signal<IGroup | null>(null);
  private readonly _enrollments = signal<IEnrollmentRow[]>([]);
  private readonly _submissions = signal<ISubmissionRow[]>([]);
  private readonly _isLoading   = signal(true);

  readonly group = this._group.asReadonly();

  // Reseñas de estudiantes de ESTE curso (feedback independiente por curso).
  readonly reviews = computed(() =>
    MOCK_REVIEWS.filter(r => r.courseId === this._courseId())
  );

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
    }).subscribe(({ course, group, enrollments, submissions }) => {
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
      this._isLoading.set(false);
    });
  }

  setActiveTab(tab: TCourseDetailTab): void {
    this._activeTab.set(tab);
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

  openSubmission(sub: ISubmissionRow): void { this._selectedSubId.set(sub.id); }
  backToSubmissionList(): void { this._selectedSubId.set(null); }

  grade(event: IGradeSubmitEvent): void {
    this.enrollmentService.gradeSubmission(event.submissionId, event.grade, event.feedback)
      .subscribe(updated => {
        this._submissions.update(list =>
          list.map(s => s.id === updated.id ? { ...s, ...updated } : s)
        );
        this.backToSubmissionList();
      });
  }
}
