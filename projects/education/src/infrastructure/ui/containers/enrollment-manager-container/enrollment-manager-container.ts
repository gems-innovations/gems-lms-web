import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CourseService } from '../../../services/course.service';
import { EnrollmentService, IStudentProfile } from '../../../services/enrollment.service';
import { ICourse } from '../../../../domain/model/course.model';
import { LoadingSkeletonComponent } from 'shared';
import { EnrollStudentSearch } from '../../components/enroll-student-search/enroll-student-search';
import { EnrollResultBanner } from '../../components/enroll-result-banner/enroll-result-banner';

export interface IBulkEnrollEntry { email: string; courseId: string; }
export interface IBulkResult      { success: number; skipped: number; errors: string[]; }
export type TEnrollTab = 'individual' | 'bulk';

@Component({
  selector: 'edu-enrollment-manager-container',
  standalone: true,
  imports: [FormsModule, LoadingSkeletonComponent, EnrollStudentSearch, EnrollResultBanner],
  templateUrl: './enrollment-manager-container.html',
  styleUrl: './enrollment-manager-container.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnrollmentManagerContainer implements OnInit {
  private readonly courseService     = inject(CourseService);
  private readonly enrollmentService = inject(EnrollmentService);

  protected readonly courses    = signal<ICourse[]>([]);
  protected readonly students   = signal<IStudentProfile[]>([]);
  protected readonly isLoading  = signal(true);
  protected readonly bulkResult = signal<IBulkResult | null>(null);

  protected readonly activeTab       = signal<TEnrollTab>('individual');
  protected readonly selectedStudent = signal<IStudentProfile | null>(null);
  protected readonly selectedCourse  = signal('');
  protected readonly bulkText        = signal('');
  protected readonly bulkCourseId    = signal('');

  protected readonly bulkEntries = computed((): IBulkEnrollEntry[] => {
    const cid = this.bulkCourseId();
    return this.bulkText().split('\n')
      .map(l => l.trim())
      .filter(l => l.includes('@'))
      .map(email => ({ email, courseId: cid }));
  });

  ngOnInit(): void {
    this.courseService.getCourses().subscribe(res => this.courses.set(res.courses));
    this.enrollmentService.getStudents().subscribe(s => {
      this.students.set(s);
      this.isLoading.set(false);
    });
  }

  protected selectStudent(s: IStudentProfile): void { this.selectedStudent.set(s); }
  protected clearStudent(): void { this.selectedStudent.set(null); }

  protected initials(s: IStudentProfile): string {
    return (s.firstName[0] + s.lastName[0]).toUpperCase();
  }

  protected enrollSingle(): void {
    const s = this.selectedStudent();
    const c = this.selectedCourse();
    if (!s || !c) return;
    this.enrollmentService.enrollStudent(s.id, c).subscribe(() => {
      this.bulkResult.set({ success: 1, skipped: 0, errors: [] });
      this.selectedStudent.set(null);
      this.selectedCourse.set('');
      setTimeout(() => this.bulkResult.set(null), 4000);
    });
  }

  protected submitBulk(): void {
    const entries = this.bulkEntries();
    if (!entries.length || !this.bulkCourseId()) return;
    this.enrollmentService.bulkEnroll(entries).subscribe(result => {
      this.bulkResult.set(result);
    });
  }
}
