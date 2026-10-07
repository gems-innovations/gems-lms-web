import {
  Component, input, output, signal, computed, effect, inject, ChangeDetectionStrategy, HostListener,
} from '@angular/core';
import { GradingToolsService, IFeedbackSnippet, ISimilarityMatch } from '../../../services/grading-tools.service';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarkdownComponent } from 'ngx-markdown';
import { EContentType } from 'education';
import type { IRubricItem } from 'education';
import {
  AvatarComponent, BadgeComponent, BackButtonComponent, EmptyStateComponent,
  LibButtonComponent, MarkdownEditorComponent, FileUploadService, ToastService,
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
  private readonly tools = inject(GradingToolsService);
  private readonly toast = inject(ToastService);

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
  /** Previous (-1) or next (1) submission of the assignment. */
  readonly navigate           = output<1 | -1>();

  // ── Herramientas: similitud entre entregas y comentarios frecuentes ────────
  protected readonly similarity = signal<ISimilarityMatch[]>([]);
  protected readonly snippets   = signal<IFeedbackSnippet[]>([]);
  protected readonly snippetsOpen = signal(false);

  /** Mayor parecido de cada entrega con otra del mismo grupo. */
  protected readonly similarityBySubmission = computed(() => {
    const byId = new Map(this.submissions().map(s => [s.id, s]));
    const best = new Map<string, { score: number; other: string; excerpt: string }>();
    for (const m of this.similarity()) {
      for (const [mine, other] of [[m.submissionId, m.otherSubmissionId], [m.otherSubmissionId, m.submissionId]]) {
        const current = best.get(mine);
        if (current && current.score >= m.score) continue;
        const o = byId.get(other);
        best.set(mine, { score: m.score, excerpt: m.sharedExcerpt,
          other: o ? `${o.student.firstName} ${o.student.lastName}` : 'otra entrega' });
      }
    }
    return best;
  });

  protected readonly position = computed(() => {
    const list = this.submissions();
    const i = list.findIndex(s => s.id === this.selectedSubmission()?.id);
    return { index: i + 1, total: list.length, pending: list.filter(s => s.grade == null).length };
  });

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
    // Similitud de la evaluación abierta (solo entregas con texto).
    effect(() => {
      const assignment = this.selectedAssignment();
      const courseId = this.submissions()[0]?.courseId;
      if (!assignment || !courseId) { this.similarity.set([]); return; }
      this.tools.similarity(courseId, String(assignment.block.id)).subscribe({
        next: list => this.similarity.set(list),
        error: () => this.similarity.set([]),
      });
    });
    this.tools.snippets().subscribe({ next: list => this.snippets.set(list), error: () => this.snippets.set([]) });

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

  protected submit(next = false): void {
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
      next,
    });
  }

  /** Atajos: Ctrl+Enter guarda, Ctrl+Shift+Enter guarda y abre la siguiente, Alt+←/→ navega. */
  @HostListener('document:keydown', ['$event'])
  protected onKey(event: KeyboardEvent): void {
    if (!this.selectedSubmission()) return;
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      if (this.rubric().length && !this.rubricValid()) return;
      this.submit(event.shiftKey);
    } else if (event.altKey && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
      event.preventDefault();
      this.navigate.emit(event.key === 'ArrowRight' ? 1 : -1);
    }
  }

  protected insertSnippet(snippet: IFeedbackSnippet): void {
    const current = this.feedbackInput().trimEnd();
    this.feedbackInput.set(current ? `${current}\n\n${snippet.text}` : snippet.text);
    this.tools.useSnippet(snippet.id).subscribe({ error: () => undefined });
  }

  protected saveAsSnippet(): void {
    const text = this.feedbackInput().trim();
    if (!text) { this.toast.info('Escribe primero el comentario que quieres guardar.'); return; }
    this.tools.saveSnippet(text).subscribe({
      next: saved => {
        this.snippets.update(list => [saved, ...list.filter(s => s.id !== saved.id)]);
        this.toast.success('Comentario guardado para reutilizarlo.');
      },
      error: err => this.toast.error(err?.error?.message ?? 'No se pudo guardar el comentario.'),
    });
  }

  protected removeSnippet(snippet: IFeedbackSnippet, event: Event): void {
    event.stopPropagation();
    this.tools.deleteSnippet(snippet.id).subscribe({
      next: () => this.snippets.update(list => list.filter(s => s.id !== snippet.id)),
      error: () => this.toast.error('No se pudo eliminar el comentario.'),
    });
  }

  protected pct(score: number): number { return Math.round(score * 100); }

  protected setRubricPoints(id: string, value: number): void {
    this.rubricPoints.update(p => ({ ...p, [id]: value }));
  }

  protected setRubricComment(id: string, value: string): void {
    this.rubricComments.update(c => ({ ...c, [id]: value }));
  }
}
