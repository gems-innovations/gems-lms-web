import {
  Component, input, output, signal, computed, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ICourse, IContentBlock, EContentType } from '../../../../domain/model/course.model';
import { IEnrollment, IAssignmentSubmission } from '../../../../domain/model/enrollment.model';
import { IStudentProfile } from '../../../services/enrollment.service';
import { IInstructorNotification } from '../../../services/notification.service';

export type TInstructorTab = 'students' | 'assignments';

export interface IGradeSubmissionEvent {
  submissionId: string;
  grade: number;
  feedback: string;
}

export interface IEnrollmentRow extends IEnrollment { student: IStudentProfile; }
export interface ISubmissionRow extends IAssignmentSubmission { student: IStudentProfile; }

export interface ICourseStats {
  studentCount: number;
  avgProgress: number;
  avgGrade: number | null;
  pendingCount: number;
}

export interface IAssignmentEntry {
  block: IContentBlock;
  lessonTitle: string;
  moduleTitle: string;
  submittedCount: number;
  pendingCount: number;
  gradedCount: number;
}

@Component({
  selector: 'edu-instructor-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './instructor-view.html',
  styleUrl: './instructor-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InstructorView {
  readonly courses        = input<ICourse[]>([]);
  readonly enrollments    = input<IEnrollmentRow[]>([]);
  readonly submissions    = input<ISubmissionRow[]>([]);
  readonly notifications  = input<IInstructorNotification[]>([]);
  readonly unreadCount    = input(0);
  readonly isLoading      = input(false);

  readonly onGrade        = output<IGradeSubmissionEvent>();
  readonly onMarkRead     = output<string>();
  readonly onMarkAllRead  = output<void>();

  // ── Navigation state ───────────────────────────────────────────────────────
  readonly selectedCourseId = signal<string | null>(null);
  readonly selectedBlockId  = signal<string | null>(null);
  readonly activeTab        = signal<TInstructorTab>('students');
  readonly notifOpen        = signal(false);

  // ── Grading state ──────────────────────────────────────────────────────────
  readonly gradingId     = signal<string | null>(null);
  readonly gradeInput    = signal<number>(0);
  readonly feedbackInput = signal('');

  // ── Submission detail (level 4) ────────────────────────────────────────────
  readonly PAGE_SIZE = 5;
  readonly submissionPage       = signal(0);
  readonly selectedSubmissionId = signal<string | null>(null);

  readonly pagedSubmissions = computed(() => {
    const page = this.submissionPage();
    const subs = this.blockSubmissions();
    return subs.slice(page * this.PAGE_SIZE, (page + 1) * this.PAGE_SIZE);
  });

  readonly totalPages = computed(() =>
    Math.ceil(this.blockSubmissions().length / this.PAGE_SIZE)
  );

  readonly selectedSubmission = computed(() =>
    this.blockSubmissions().find(s => s.id === this.selectedSubmissionId()) ?? null
  );

  // ── Selected course ────────────────────────────────────────────────────────
  readonly selectedCourse = computed(() =>
    this.courses().find(c => c.id === this.selectedCourseId()) ?? null
  );

  readonly courseEnrollments = computed(() =>
    this.enrollments().filter(e => e.courseId === this.selectedCourseId())
  );

  readonly courseSubmissions = computed(() =>
    this.submissions().filter(s => s.courseId === this.selectedCourseId())
  );

  // ── Assignments (evaluations) of the selected course ──────────────────────
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
            block,
            lessonTitle: lesson.title,
            moduleTitle: mod.title,
            submittedCount: blockSubs.length,
            pendingCount: blockSubs.filter(s => s.status === 'pending').length,
            gradedCount: blockSubs.filter(s => s.status !== 'pending').length
          });
        }
      }
    }
    return entries;
  });

  // ── Selected assignment detail ─────────────────────────────────────────────
  readonly selectedAssignment = computed(() =>
    this.courseAssignments().find(a => a.block.id === this.selectedBlockId()) ?? null
  );

  readonly blockSubmissions = computed(() =>
    this.courseSubmissions().filter(s => s.blockId === this.selectedBlockId())
  );

  readonly blockPending = computed(() =>
    this.blockSubmissions().filter(s => s.status === 'pending')
  );

  readonly blockGraded = computed(() =>
    this.blockSubmissions().filter(s => s.status !== 'pending')
  );

  // ── Analytics for selected course ─────────────────────────────────────────
  readonly courseStats = computed<ICourseStats>(() =>
    this.statsFor(this.selectedCourseId() ?? '')
  );

  statsFor(courseId: string): ICourseStats {
    const enr = this.enrollments().filter(e => e.courseId === courseId);
    const sub = this.submissions().filter(s => s.courseId === courseId);
    const graded = sub.filter(s => s.grade != null);

    const avgProgress = enr.length
      ? Math.round(enr.reduce((acc, e) => acc + (e.progress?.overallPercentage ?? 0), 0) / enr.length)
      : 0;

    const avgGrade = graded.length
      ? Math.round(graded.reduce((acc, s) => acc + (s.grade ?? 0), 0) / graded.length)
      : null;

    return {
      studentCount: enr.length,
      avgProgress,
      avgGrade,
      pendingCount: sub.filter(s => s.status === 'pending').length
    };
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  openCourse(courseId: string): void {
    this.selectedCourseId.set(courseId);
    this.selectedBlockId.set(null);
    this.activeTab.set('students');
    this.closeGrading();
  }

  backToCourses(): void {
    this.selectedCourseId.set(null);
    this.selectedBlockId.set(null);
    this.closeGrading();
  }

  openAssignment(blockId: string): void {
    this.selectedBlockId.set(blockId);
    this.selectedSubmissionId.set(null);
    this.submissionPage.set(0);
    this.closeGrading();
  }

  backToAssignments(): void {
    this.selectedBlockId.set(null);
    this.selectedSubmissionId.set(null);
    this.closeGrading();
  }

  openSubmission(sub: ISubmissionRow): void {
    this.selectedSubmissionId.set(sub.id);
    this.gradeInput.set(sub.grade ?? 0);
    this.feedbackInput.set(sub.feedback ?? '');
  }

  backToSubmissionList(): void {
    this.selectedSubmissionId.set(null);
    this.gradingId.set(null);
  }

  // ── Notifications ─────────────────────────────────────────────────────────
  toggleNotifications(): void { this.notifOpen.update(v => !v); }
  closeNotifications(): void  { this.notifOpen.set(false); }

  openNotification(n: IInstructorNotification): void {
    this.onMarkRead.emit(n.id);
    this.closeNotifications();
    this.selectedCourseId.set(n.courseId);
    this.activeTab.set('assignments');
    // Open the assignment of the submission if we can resolve it
    const sub = this.submissions().find(s => s.id === n.submissionId);
    this.selectedBlockId.set(sub?.blockId ?? null);
  }

  // ── Grading ───────────────────────────────────────────────────────────────
  openGrading(sub: ISubmissionRow): void {
    this.gradingId.set(sub.id);
    this.gradeInput.set(sub.grade ?? 0);
    this.feedbackInput.set(sub.feedback ?? '');
  }

  closeGrading(): void { this.gradingId.set(null); }

  submitGrade(): void {
    const id = this.gradingId();
    if (!id) return;
    this.onGrade.emit({ submissionId: id, grade: this.gradeInput(), feedback: this.feedbackInput() });
    this.gradingId.set(null);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  blockTypeLabel(type: EContentType): string {
    return type === EContentType.QUIZ ? 'Quiz' : 'Tarea';
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = { pending: 'Pendiente', graded: 'Calificado', returned: 'Devuelto' };
    return map[status] ?? status;
  }

  initials(s: IStudentProfile): string {
    return (s.firstName[0] + s.lastName[0]).toUpperCase();
  }

  minVal(a: number, b: number): number { return Math.min(a, b); }

  timeAgo(date: Date): string {
    const diffMs = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `hace ${Math.max(mins, 1)} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `hace ${days}d`;
  }
}
