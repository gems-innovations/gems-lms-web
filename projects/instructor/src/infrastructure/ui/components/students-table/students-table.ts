import { Component, input, output, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  AvatarComponent, ProgressBarComponent, BadgeComponent, EmptyStateComponent,
  SearchBarComponent, PaginationComponent, LibButtonComponent,
} from 'shared';
import type { BadgeVariant } from 'shared';
import type { IEnrollmentRow } from '../../../../domain/model/instructor.model';

const PAGE_SIZE = 8;

@Component({
  selector: 'ins-students-table',
  standalone: true,
  imports: [
    DatePipe, AvatarComponent, ProgressBarComponent, BadgeComponent, EmptyStateComponent,
    SearchBarComponent, PaginationComponent, LibButtonComponent,
  ],
  templateUrl: './students-table.html',
  styleUrl: './students-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentsTable {
  readonly enrollments = input<IEnrollmentRow[]>([]);

  readonly selectStudent = output<string>();
  readonly exportExcel   = output<void>();

  protected readonly search = signal('');
  protected readonly page   = signal(1);

  protected readonly filtered = computed(() => {
    const q = this.search().toLowerCase().trim();
    if (!q) return this.enrollments();
    return this.enrollments().filter(e =>
      `${e.student.firstName} ${e.student.lastName}`.toLowerCase().includes(q) ||
      e.student.email.toLowerCase().includes(q)
    );
  });

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE))
  );

  protected readonly paged = computed(() => {
    const p = this.page();
    return this.filtered().slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
  });

  protected onSearch(v: string): void { this.search.set(v); this.page.set(1); }

  protected statusVariant(status: string): BadgeVariant {
    const map: Record<string, BadgeVariant> = {
      active: 'success', completed: 'primary', paused: 'warning', inactive: 'neutral',
    };
    return map[status] ?? 'neutral';
  }

  protected statusLabel(status: string): string {
    const map: Record<string, string> = {
      active: 'Activo', completed: 'Completado', paused: 'Pausado', inactive: 'Inactivo',
    };
    return map[status] ?? status;
  }
}
