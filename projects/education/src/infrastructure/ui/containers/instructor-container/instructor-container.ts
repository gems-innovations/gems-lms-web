import {
  Component, inject, signal, computed, OnInit, ChangeDetectionStrategy
} from '@angular/core';
import { CourseService } from '../../../services/course.service';
import { EnrollmentService } from '../../../services/enrollment.service';
import { NotificationService, IInstructorNotification } from '../../../services/notification.service';
import { ICourse, EContentType } from '../../../../domain/model/course.model';
import { IContentBlock } from '../../../../domain/model/course.model';
import {
  PageComponent, PageHeaderComponent, StatGridComponent,
  StatCardComponent, LoadingSkeletonComponent, EmptyStateComponent,
} from 'shared';
import { InstructorCourseCard, ICourseStats } from '../../components/instructor-course-card/instructor-course-card';
import { InstructorNotificationsPanel } from '../../components/instructor-notifications-panel/instructor-notifications-panel';
import { InstructorStudentTable, IEnrollmentRow } from '../../components/instructor-student-table/instructor-student-table';
import { InstructorAssignmentsList, IAssignmentEntry } from '../../components/instructor-assignments-list/instructor-assignments-list';
import { InstructorSubmissionsTable, ISubmissionRow } from '../../components/instructor-submissions-table/instructor-submissions-table';
import { InstructorSubmissionDetail, IGradeSubmitEvent } from '../../components/instructor-submission-detail/instructor-submission-detail';

export type TInstructorTab = 'students' | 'assignments';

@Component({
  selector: 'edu-instructor-container',
  standalone: true,
  imports: [
    PageComponent,
    PageHeaderComponent,
    StatGridComponent,
    StatCardComponent,
    LoadingSkeletonComponent,
    EmptyStateComponent,
    InstructorCourseCard,
    InstructorNotificationsPanel,
    InstructorStudentTable,
    InstructorAssignmentsList,
    InstructorSubmissionsTable,
    InstructorSubmissionDetail,
  ],
  templateUrl: './instructor-container.html',
  styleUrl: './instructor-container.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstructorContainer implements OnInit {
  private readonly courseService     = inject(CourseService);
  private readonly enrollmentService = inject(EnrollmentService);
  protected readonly notifService    = inject(NotificationService);

  // ── Data ────────────────────────────────────────────────────────────────────
  protected readonly courses     = signal<ICourse[]>([]);
  protected readonly enrollments = signal<IEnrollmentRow[]>([]);
  protected readonly submissions = signal<ISubmissionRow[]>([]);
  protected readonly isLoading   = signal(true);

  // ── Navigation state ────────────────────────────────────────────────────────
  protected readonly selectedCourseId = signal<string | null>(null);
  protected readonly selectedBlockId  = signal<string | null>(null);
  protected readonly activeTab        = signal<TInstructorTab>('students');
  protected readonly submissionPage   = signal(0);
  protected readonly selectedSubId    = signal<string | null>(null);
  protected readonly PAGE_SIZE = 5;

  // ── Computed: selected course ────────────────────────────────────────────────
  protected readonly selectedCourse = computed(() =>
    this.courses().find(c => c.id === this.selectedCourseId()) ?? null
  );

  protected readonly courseEnrollments = computed(() =>
    this.enrollments().filter(e => e.courseId === this.selectedCourseId())
  );

  protected readonly courseSubmissions = computed(() =>
    this.submissions().filter(s => s.courseId === this.selectedCourseId())
  );

  protected readonly courseAssignments = computed<IAssignmentEntry[]>(() => {
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
            block,
            lessonTitle: lesson.title,
            moduleTitle: mod.title,
            submittedCount: blockSubs.length,
            pendingCount: blockSubs.filter(s => s.status === 'pending').length,
            gradedCount:  blockSubs.filter(s => s.status !== 'pending').length,
          });
        }
      }
    }
    return entries;
  });

  protected readonly courseStats = computed<ICourseStats>(() =>
    this.statsFor(this.selectedCourseId() ?? '')
  );

  // ── Computed: selected assignment ────────────────────────────────────────────
  protected readonly selectedAssignment = computed(() =>
    this.courseAssignments().find(a => a.block.id === this.selectedBlockId()) ?? null
  );

  protected readonly blockSubmissions = computed(() =>
    this.courseSubmissions().filter(s => s.blockId === this.selectedBlockId())
  );

  protected readonly pagedSubmissions = computed(() => {
    const page = this.submissionPage();
    return this.blockSubmissions().slice(page * this.PAGE_SIZE, (page + 1) * this.PAGE_SIZE);
  });

  // ── Computed: selected submission ────────────────────────────────────────────
  protected readonly selectedSubmission = computed(() =>
    this.blockSubmissions().find(s => s.id === this.selectedSubId()) ?? null
  );

  // ── Header title (changes with navigation depth) ─────────────────────────────
  protected readonly headerTitle = computed(() => {
    const assignment = this.selectedAssignment();
    const course = this.selectedCourse();
    if (assignment) return assignment.block.title;
    if (course) return course.title;
    return 'Panel Instructor';
  });

  protected readonly headerSubtitle = computed(() => {
    const assignment = this.selectedAssignment();
    const course = this.selectedCourse();
    if (assignment) return `${assignment.moduleTitle} · ${assignment.lessonTitle}`;
    if (course) return 'Estudiantes, evaluaciones y calificaciones de este curso.';
    return 'Selecciona un curso para ver sus estudiantes, evaluaciones y entregas.';
  });

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.courseService.getCourses().subscribe(res => {
      this.courses.set(res.courses);
    });

    this.enrollmentService.getAllCourseEnrollments().subscribe(rows => {
      this.enrollments.set(rows as IEnrollmentRow[]);
      this.isLoading.set(false);
    });

    this.enrollmentService.getAllSubmissions().subscribe(rows => {
      this.submissions.set(rows as ISubmissionRow[]);
    });
  }

  // ── Navigation ───────────────────────────────────────────────────────────────
  protected openCourse(courseId: string): void {
    this.selectedCourseId.set(courseId);
    this.selectedBlockId.set(null);
    this.activeTab.set('students');
    this.selectedSubId.set(null);
  }

  protected backToCourses(): void {
    this.selectedCourseId.set(null);
    this.selectedBlockId.set(null);
    this.selectedSubId.set(null);
  }

  protected openAssignment(blockId: string): void {
    this.selectedBlockId.set(blockId);
    this.selectedSubId.set(null);
    this.submissionPage.set(0);
  }

  protected backToAssignments(): void {
    this.selectedBlockId.set(null);
    this.selectedSubId.set(null);
  }

  protected openSubmission(sub: ISubmissionRow): void {
    this.selectedSubId.set(sub.id);
  }

  protected backToSubmissionList(): void {
    this.selectedSubId.set(null);
  }

  // ── Notifications ────────────────────────────────────────────────────────────
  protected handleNotification(n: IInstructorNotification): void {
    this.selectedCourseId.set(n.courseId);
    this.activeTab.set('assignments');
    const sub = this.submissions().find(s => s.id === n.submissionId);
    this.selectedBlockId.set(sub?.blockId ?? null);
  }

  // ── Actions ──────────────────────────────────────────────────────────────────
  protected grade(event: IGradeSubmitEvent): void {
    this.enrollmentService.gradeSubmission(event.submissionId, event.grade, event.feedback)
      .subscribe(updated => {
        this.submissions.update(list =>
          list.map(s => s.id === updated.id ? { ...s, ...updated } : s)
        );
        this.backToSubmissionList();
      });
  }

  // ── Stats ────────────────────────────────────────────────────────────────────
  protected statsFor(courseId: string): ICourseStats {
    const enr = this.enrollments().filter(e => e.courseId === courseId);
    const sub = this.submissions().filter(s => s.courseId === courseId);
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
}
