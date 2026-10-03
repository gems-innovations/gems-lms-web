import {
  Component, input, output, signal, computed, effect, inject, ChangeDetectionStrategy,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarkdownComponent } from 'ngx-markdown';
import { EContentType } from 'education';
import {
  AvatarComponent, BadgeComponent, BackButtonComponent, EmptyStateComponent,
  LibButtonComponent, MarkdownEditorComponent, FileUploadService,
} from 'shared';
import type { BadgeVariant } from 'shared';
import type {
  IAssignmentEntry, ISubmissionRow, IGradeSubmitEvent, IEnrollmentRow,
} from '../../../../domain/model/instructor.model';

@Component({
  selector: 'ins-grading-panel',
  standalone: true,
  imports: [
    DatePipe, FormsModule, MarkdownComponent,
    AvatarComponent, BadgeComponent, BackButtonComponent, EmptyStateComponent,
    LibButtonComponent, MarkdownEditorComponent,
  ],
  templateUrl: './grading-panel.html',
  styleUrl: './grading-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GradingPanel {
  private readonly files = inject(FileUploadService);

  /** Delivered files of the API need the token: they are fetched and opened as a blob. */
  protected openFile(url: string, event: Event): void {
    if (!this.files.isPrivateApiFile(url)) return;
    event.preventDefault();
    this.files.open(url);
  }

  readonly assignments        = input<IAssignmentEntry[]>([]);
  readonly selectedAssignment = input<IAssignmentEntry | null>(null);
  readonly submissions        = input<ISubmissionRow[]>([]);
  readonly selectedSubmission = input<ISubmissionRow | null>(null);
  readonly nonSubmitters      = input<IEnrollmentRow[]>([]);

  readonly selectAssignment   = output<string>();
  readonly backToAssignments  = output<void>();
  readonly selectSubmission   = output<ISubmissionRow>();
  readonly backToSubmissions  = output<void>();
  readonly gradeSubmit        = output<IGradeSubmitEvent>();

  protected readonly EContentType = EContentType;

  protected readonly gradeInput    = signal<number>(0);
  protected readonly feedbackInput = signal<string>('');

  protected readonly gradeColor = computed<'high' | 'mid' | 'low'>(() => {
    const g = this.gradeInput();
    if (g >= 80) return 'high';
    if (g >= 60) return 'mid';
    return 'low';
  });

  constructor() {
    // Sincroniza el formulario cuando cambia la entrega seleccionada.
    effect(() => {
      const sub = this.selectedSubmission();
      this.gradeInput.set(sub?.grade ?? 0);
      this.feedbackInput.set(sub?.feedback ?? '');
    });
  }

  protected statusVariant(status: string): BadgeVariant {
    const map: Record<string, BadgeVariant> = { pending: 'warning', graded: 'success', returned: 'info' };
    return map[status] ?? 'neutral';
  }

  protected statusLabel(status: string): string {
    const map: Record<string, string> = { pending: 'Pendiente', graded: 'Calificado', returned: 'Devuelto' };
    return map[status] ?? status;
  }

  protected submit(): void {
    const sub = this.selectedSubmission();
    if (!sub) return;
    this.gradeSubmit.emit({
      submissionId: sub.id,
      grade: this.gradeInput(),
      feedback: this.feedbackInput(),
    });
  }
}
