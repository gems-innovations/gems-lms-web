import {
  Component, input, output, signal, computed, effect, inject, ChangeDetectionStrategy,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarkdownComponent } from 'ngx-markdown';
import { EContentType } from 'education';
import type { IRubricItem } from 'education';
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

  /** Rubric of the selected assignment; when present the grade comes from its criteria. */
  protected readonly rubric = computed<IRubricItem[]>(() =>
    (this.selectedAssignment()?.block.rubric ?? []).filter(r => r.maxPoints > 0));
  protected readonly rubricPoints   = signal<Record<string, number>>({});
  protected readonly rubricComments = signal<Record<string, string>>({});

  /** Percentage of the rubric points, as the API computes it. */
  protected readonly rubricGrade = computed(() => {
    const items = this.rubric();
    const possible = items.reduce((a, r) => a + r.maxPoints, 0);
    if (!possible) return 0;
    const earned = items.reduce((a, r) => a + (this.rubricPoints()[r.id] ?? 0), 0);
    return Math.round(earned * 100 / possible);
  });

  protected readonly effectiveGrade = computed(() => this.rubric().length ? this.rubricGrade() : this.gradeInput());

  protected readonly rubricValid = computed(() => this.rubric().every(r => {
    const p = this.rubricPoints()[r.id];
    return p != null && p >= 0 && p <= r.maxPoints;
  }));

  protected readonly gradeColor = computed<'high' | 'mid' | 'low'>(() => {
    const g = this.effectiveGrade();
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
      const points: Record<string, number> = {};
      const comments: Record<string, string> = {};
      for (const s of sub?.rubricScores ?? []) {
        points[s.criterionId] = s.score;
        if (s.comment) comments[s.criterionId] = s.comment;
      }
      this.rubricPoints.set(points);
      this.rubricComments.set(comments);
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
    const rubric = this.rubric();
    if (rubric.length && !this.rubricValid()) return;
    this.gradeSubmit.emit({
      submissionId: sub.id,
      grade: this.effectiveGrade(),
      feedback: this.feedbackInput(),
      rubricScores: rubric.length
        ? rubric.map(r => ({
            criterionId: r.id,
            score: this.rubricPoints()[r.id] ?? 0,
            ...(this.rubricComments()[r.id]?.trim() ? { comment: this.rubricComments()[r.id].trim() } : {}),
          }))
        : undefined,
    });
  }

  protected setRubricPoints(id: string, value: number): void {
    this.rubricPoints.update(p => ({ ...p, [id]: value }));
  }

  protected setRubricComment(id: string, value: string): void {
    this.rubricComments.update(c => ({ ...c, [id]: value }));
  }
}
