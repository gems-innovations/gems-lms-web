import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  EnrollmentService, CourseService, LearningPathService,
  ICourse, ILearningPath, IStudentProfile,
  EnrollStudentSearch, EnrollResultBanner
} from 'education';
import { LoadingSkeletonComponent } from 'shared';

export type TEnrollTarget = 'course' | 'path';
export interface IEnrollResult { success: number; skipped: number; }

@Component({
  selector: 'adm-enrollment-manager-container',
  standalone: true,
  imports: [FormsModule, LoadingSkeletonComponent, EnrollStudentSearch, EnrollResultBanner],
  templateUrl: './enrollment-manager-container.html',
  styleUrl: './enrollment-manager-container.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnrollmentManagerContainer implements OnInit {
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly courseService     = inject(CourseService);
  private readonly pathService       = inject(LearningPathService);

  protected readonly courses    = signal<ICourse[]>([]);
  protected readonly paths      = signal<ILearningPath[]>([]);
  protected readonly students   = signal<IStudentProfile[]>([]);
  protected readonly isLoading  = signal(true);
  protected readonly result     = signal<IEnrollResult | null>(null);

  protected readonly selectedIds  = signal<Set<string>>(new Set());
  protected readonly targetType   = signal<TEnrollTarget>('course');
  protected readonly targetId     = signal('');

  protected readonly selectedStudents = computed(() =>
    this.students().filter(s => this.selectedIds().has(s.id))
  );

  protected readonly canEnroll = computed(() =>
    this.selectedIds().size > 0 && !!this.targetId()
  );

  ngOnInit(): void {
    this.courseService.getCourses().subscribe(res => this.courses.set(res.courses));
    this.pathService.getLearningPaths().subscribe(res => this.paths.set(res.learningPaths));
    this.enrollmentService.getStudents().subscribe(s => {
      this.students.set(s);
      this.isLoading.set(false);
    });
  }

  protected toggleStudent(s: IStudentProfile): void {
    this.selectedIds.update(set => {
      const next = new Set(set);
      next.has(s.id) ? next.delete(s.id) : next.add(s.id);
      return next;
    });
  }

  protected removeStudent(id: string): void {
    this.selectedIds.update(set => { const n = new Set(set); n.delete(id); return n; });
  }

  protected setTargetType(type: TEnrollTarget): void {
    this.targetType.set(type);
    this.targetId.set('');
  }

  protected initials(s: IStudentProfile): string {
    return (s.firstName[0] + s.lastName[0]).toUpperCase();
  }

  protected enroll(): void {
    if (!this.canEnroll()) return;
    this.enrollmentService
      .enrollStudents([...this.selectedIds()], this.targetId(), this.targetType())
      .subscribe(r => {
        this.result.set(r);
        this.selectedIds.set(new Set());
        this.targetId.set('');
        setTimeout(() => this.result.set(null), 5000);
      });
  }
}
