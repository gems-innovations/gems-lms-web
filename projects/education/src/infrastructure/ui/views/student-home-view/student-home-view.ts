import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IEnrollment } from '../../../../domain/model/enrollment.model';
import { ICourse } from '../../../../domain/model/course.model';
import { ILearningPath } from '../../../../domain/model/learning-path.model';
import { ILearningPathEnrollment } from '../../../../domain/model/enrollment.model';

export interface IEnrolledCourseEntry {
  enrollment: IEnrollment;
  course: ICourse;
}

export interface IEnrolledPathEntry {
  enrollment: ILearningPathEnrollment;
  path: ILearningPath;
}

@Component({
  selector: 'edu-student-home-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './student-home-view.html',
  styleUrl: './student-home-view.scss'
})
export class StudentHomeView {
  // ── Inputs ───────────────────────────────────────────────────────────────────
  readonly inProgress        = input<IEnrolledCourseEntry[]>([]);
  readonly completed         = input<IEnrolledCourseEntry[]>([]);
  readonly enrolledPathEntries = input<IEnrolledPathEntry[]>([]);
  readonly enrolledCount     = input<number>(0);
  readonly isLoading         = input<boolean>(false);

  // ── Outputs ──────────────────────────────────────────────────────────────────
  readonly onContinueCourse = output<IEnrolledCourseEntry>();
  readonly onOpenPath       = output<string>();

  // ── Display helpers ───────────────────────────────────────────────────────────
  formatProgress(n: number): string { return `${Math.round(n)}%`; }

  formatDuration(minutes: number): string {
    if (!minutes) return '—';
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }
}
