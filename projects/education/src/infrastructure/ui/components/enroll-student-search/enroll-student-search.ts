import { Component, input, output, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IStudentProfile } from '../../../services/enrollment.service';

@Component({
  selector: 'edu-enroll-student-search',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './enroll-student-search.html',
  styleUrl: './enroll-student-search.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnrollStudentSearch {
  readonly students       = input<IStudentProfile[]>([]);
  readonly selectedIds    = input<Set<string>>(new Set());

  readonly studentSelect  = output<IStudentProfile>();

  protected readonly search = signal('');

  protected readonly filtered = computed(() => {
    const q = this.search().toLowerCase();
    if (!q) return [];
    return this.students().filter(s =>
      `${s.firstName} ${s.lastName} ${s.email}`.toLowerCase().includes(q)
    );
  });

  protected select(s: IStudentProfile): void {
    this.studentSelect.emit(s);
    this.search.set('');
  }

  protected initials(s: IStudentProfile): string {
    return (s.firstName[0] + s.lastName[0]).toUpperCase();
  }
}
