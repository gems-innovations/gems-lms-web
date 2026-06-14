import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { IStudentProfile } from '../../../services/enrollment.service';
import { ISubmissionRow } from '../../../../domain/model/instructor.model';

@Component({
  selector: 'edu-instructor-submissions-table',
  templateUrl: './instructor-submissions-table.html',
  styleUrl: './instructor-submissions-table.scss',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstructorSubmissionsTable {
  readonly submissions  = input<ISubmissionRow[]>([]);
  readonly page         = input<number>(0);
  readonly pageSize     = input<number>(5);
  readonly totalCount   = input<number>(0);

  readonly selectSubmission = output<ISubmissionRow>();
  readonly pageChange       = output<number>();

  protected readonly totalPages = computed(() =>
    Math.ceil(this.totalCount() / this.pageSize())
  );

  protected readonly rangeStart = computed(() => this.page() * this.pageSize() + 1);
  protected readonly rangeEnd   = computed(() =>
    Math.min((this.page() + 1) * this.pageSize(), this.totalCount())
  );

  protected pagesArray(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i);
  }

  protected statusLabel(status: string): string {
    const map: Record<string, string> = { pending: 'Pendiente', graded: 'Calificado', returned: 'Devuelto' };
    return map[status] ?? status;
  }

  protected initials(s: IStudentProfile): string {
    return (s.firstName[0] + s.lastName[0]).toUpperCase();
  }
}
