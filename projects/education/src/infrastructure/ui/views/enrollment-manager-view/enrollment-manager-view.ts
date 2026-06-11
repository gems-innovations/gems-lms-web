import {
  Component, input, output, signal, computed, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ICourse } from '../../../../domain/model/course.model';
import { IStudentProfile } from '../../../services/enrollment.service';

export interface IEnrollSingleEvent  { userId: string; courseId: string; }
export interface IBulkEnrollEntry    { email: string;  courseId: string; }
export interface IBulkResult         { success: number; skipped: number; errors: string[]; }

export type TEnrollTab = 'individual' | 'bulk';

@Component({
  selector: 'edu-enrollment-manager-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './enrollment-manager-view.html',
  styleUrl: './enrollment-manager-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EnrollmentManagerView {
  readonly courses        = input<ICourse[]>([]);
  readonly students       = input<IStudentProfile[]>([]);
  readonly isLoading      = input(false);
  readonly bulkResult     = input<IBulkResult | null>(null);
  readonly onEnrollSingle = output<IEnrollSingleEvent>();
  readonly onBulkEnroll   = output<IBulkEnrollEntry[]>();

  readonly activeTab       = signal<TEnrollTab>('individual');
  readonly searchStudent   = signal('');
  readonly selectedStudent = signal<IStudentProfile | null>(null);
  readonly selectedCourse  = signal('');
  readonly bulkText        = signal('');
  readonly bulkCourseId    = signal('');

  readonly filteredStudents = computed(() => {
    const q = this.searchStudent().toLowerCase();
    if (!q) return this.students();
    return this.students().filter(s =>
      `${s.firstName} ${s.lastName} ${s.email}`.toLowerCase().includes(q)
    );
  });

  selectStudent(s: IStudentProfile): void {
    this.selectedStudent.set(s);
    this.searchStudent.set('');
  }

  clearStudent(): void { this.selectedStudent.set(null); }

  enrollSingle(): void {
    const s = this.selectedStudent();
    const c = this.selectedCourse();
    if (!s || !c) return;
    this.onEnrollSingle.emit({ userId: s.id, courseId: c });
    this.selectedStudent.set(null);
    this.selectedCourse.set('');
  }

  parseBulk(): IBulkEnrollEntry[] {
    const cid = this.bulkCourseId();
    return this.bulkText().split('\n')
      .map(l => l.trim())
      .filter(l => l.includes('@'))
      .map(email => ({ email, courseId: cid }));
  }

  submitBulk(): void {
    const entries = this.parseBulk();
    if (!entries.length || !this.bulkCourseId()) return;
    this.onBulkEnroll.emit(entries);
  }

  bulkPreviewCount(): number { return this.parseBulk().length; }

  initials(s: IStudentProfile): string {
    return (s.firstName[0] + s.lastName[0]).toUpperCase();
  }
}
