import { Component, input, output, signal, OnChanges, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IStudentProfile } from '../../../services/enrollment.service';
import { ISubmissionRow, IGradeSubmitEvent } from '../../../../domain/model/instructor.model';

@Component({
  selector: 'edu-instructor-submission-detail',
  templateUrl: './instructor-submission-detail.html',
  styleUrl: './instructor-submission-detail.scss',
  imports: [DatePipe, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstructorSubmissionDetail implements OnChanges {
  readonly submission = input.required<ISubmissionRow>();

  readonly gradeSubmit = output<IGradeSubmitEvent>();
  readonly back        = output<void>();

  protected readonly gradeInput    = signal<number>(0);
  protected readonly feedbackInput = signal<string>('');

  ngOnChanges(): void {
    const sub = this.submission();
    this.gradeInput.set(sub.grade ?? 0);
    this.feedbackInput.set(sub.feedback ?? '');
  }

  protected initials(s: IStudentProfile): string {
    return (s.firstName[0] + s.lastName[0]).toUpperCase();
  }

  protected statusLabel(status: string): string {
    const map: Record<string, string> = { pending: 'Pendiente', graded: 'Calificado', returned: 'Devuelto' };
    return map[status] ?? status;
  }

  protected submit(): void {
    this.gradeSubmit.emit({
      submissionId: this.submission().id,
      grade: this.gradeInput(),
      feedback: this.feedbackInput(),
    });
  }
}
