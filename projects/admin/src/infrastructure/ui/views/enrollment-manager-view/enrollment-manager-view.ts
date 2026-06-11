import {
  Component, input, output, signal, computed, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ICourse } from 'education';
import { ILearningPath } from 'education';
import { IStudentProfile } from 'education';

export type TEnrollTarget = 'course' | 'path';

export interface IEnrollEvent {
  userIds: string[];
  targetId: string;
  targetType: TEnrollTarget;
}

export interface IEnrollResult { success: number; skipped: number; }

@Component({
  selector: 'adm-enrollment-manager-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './enrollment-manager-view.html',
  styleUrl: './enrollment-manager-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EnrollmentManagerView {
  readonly courses       = input<ICourse[]>([]);
  readonly paths         = input<ILearningPath[]>([]);
  readonly students      = input<IStudentProfile[]>([]);
  readonly isLoading     = input(false);
  readonly result        = input<IEnrollResult | null>(null);
  readonly onEnroll      = output<IEnrollEvent>();

  readonly search        = signal('');
  readonly selectedIds   = signal<Set<string>>(new Set());
  readonly targetType    = signal<TEnrollTarget>('course');
  readonly targetId      = signal('');

  readonly filtered = computed(() => {
    const q = this.search().toLowerCase();
    if (!q) return this.students();
    return this.students().filter(s =>
      `${s.firstName} ${s.lastName} ${s.email}`.toLowerCase().includes(q)
    );
  });

  readonly selectedStudents = computed(() =>
    this.students().filter(s => this.selectedIds().has(s.id))
  );

  readonly canEnroll = computed(() =>
    this.selectedIds().size > 0 && !!this.targetId()
  );

  toggle(s: IStudentProfile): void {
    this.selectedIds.update(set => {
      const next = new Set(set);
      next.has(s.id) ? next.delete(s.id) : next.add(s.id);
      return next;
    });
    this.search.set('');
  }

  removeChip(id: string): void {
    this.selectedIds.update(set => { const n = new Set(set); n.delete(id); return n; });
  }

  enroll(): void {
    if (!this.canEnroll()) return;
    this.onEnroll.emit({
      userIds: [...this.selectedIds()],
      targetId: this.targetId(),
      targetType: this.targetType()
    });
    this.selectedIds.set(new Set());
    this.targetId.set('');
  }

  initials(s: IStudentProfile): string {
    return (s.firstName[0] + s.lastName[0]).toUpperCase();
  }
}
