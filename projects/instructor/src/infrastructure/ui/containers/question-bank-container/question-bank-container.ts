import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  PageComponent, PageHeaderComponent, LoadingSkeletonComponent, EmptyStateComponent, LibButtonComponent,
  PaginationComponent, ConfirmationDialogComponent, ToastService,
} from 'shared';
import { QuestionBankService } from 'education';
import type { IBankQuestion, IBankCategory, IQuestion, TBankQuestionType } from 'education';

const PAGE_SIZE = 20;

interface IDraft {
  id: string | null;
  category: string;
  type: TBankQuestionType;
  question: string;
  points: number;
  explanation: string;
  options: { id: string; text: string }[];
  correctAnswers: string[];
  allowMultiple: boolean;
  correctBoolean: boolean;
  sampleAnswer: string;
}

const emptyDraft = (category = ''): IDraft => ({
  id: null, category, type: 'multiple-choice', question: '', points: 10, explanation: '',
  options: [{ id: 'a', text: '' }, { id: 'b', text: '' }], correctAnswers: [], allowMultiple: false,
  correctBoolean: true, sampleAnswer: '',
});

const TYPE_LABELS: Record<TBankQuestionType, string> = {
  'multiple-choice': 'Opción múltiple', 'true-false': 'Verdadero / falso', open: 'Abierta',
};

/** Question bank of the institution: reusable questions that quizzes draw at random by category. */
@Component({
  selector: 'ins-question-bank-container',
  standalone: true,
  imports: [FormsModule, PageComponent, PageHeaderComponent, LoadingSkeletonComponent, EmptyStateComponent,
    LibButtonComponent, PaginationComponent, ConfirmationDialogComponent],
  templateUrl: './question-bank-container.html',
  styleUrl: './question-bank-container.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionBankContainer implements OnInit {
  private readonly bank  = inject(QuestionBankService);
  private readonly toast = inject(ToastService);

  protected readonly typeLabels = TYPE_LABELS;
  protected readonly loading    = signal(true);
  protected readonly error      = signal<string | null>(null);
  protected readonly items      = signal<IBankQuestion[]>([]);
  protected readonly total      = signal(0);
  protected readonly categories = signal<IBankCategory[]>([]);
  protected readonly category   = signal('');
  protected readonly search     = signal('');
  protected readonly page       = signal(1);
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));

  protected readonly draft      = signal<IDraft | null>(null);
  protected readonly saving     = signal(false);
  protected readonly pendingDelete = signal<IBankQuestion | null>(null);
  protected readonly deleting   = signal(false);

  /** Why the draft cannot be saved yet; null when it is valid. */
  protected readonly draftProblem = computed<string | null>(() => {
    const d = this.draft();
    if (!d) return null;
    if (!d.category.trim()) return 'Indica la categoría';
    if (!d.question.trim()) return 'Escribe la pregunta';
    if (d.type === 'multiple-choice') {
      const filled = d.options.filter(o => o.text.trim());
      if (filled.length < 2) return 'Agrega al menos dos opciones';
      if (!d.correctAnswers.some(id => filled.some(o => o.id === id))) return 'Marca la opción correcta';
    }
    return null;
  });

  ngOnInit(): void {
    this.loadCategories();
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.bank.list({ category: this.category(), search: this.search().trim(), page: this.page() - 1, limit: PAGE_SIZE })
      .subscribe({
        next: p => { this.items.set(p.items); this.total.set(p.total); this.loading.set(false); },
        error: () => { this.error.set('No se pudo cargar el banco de preguntas'); this.loading.set(false); },
      });
  }

  private loadCategories(): void {
    this.bank.categories().subscribe({ next: c => this.categories.set(c), error: () => this.categories.set([]) });
  }

  protected filterCategory(category: string): void { this.category.set(category); this.page.set(1); this.load(); }
  protected applySearch(): void { this.page.set(1); this.load(); }
  protected goToPage(page: number): void { this.page.set(page); this.load(); }

  protected newQuestion(): void { this.draft.set(emptyDraft(this.category())); }

  protected edit(item: IBankQuestion): void {
    const q = item.question as IQuestion & Record<string, any>;
    this.draft.set({
      ...emptyDraft(item.category),
      id: item.id,
      type: item.type,
      question: q.question ?? '',
      points: q.points ?? 10,
      explanation: q.explanation ?? '',
      options: q.options?.length ? q.options.map((o: { id: string; text: string }) => ({ ...o })) : emptyDraft().options,
      correctAnswers: [...(q.correctAnswers ?? [])],
      allowMultiple: !!q.allowMultiple,
      correctBoolean: q.correctAnswer ?? true,
      sampleAnswer: q.sampleAnswer ?? '',
    });
  }

  protected cancel(): void { this.draft.set(null); }

  protected patch(change: Partial<IDraft>): void { this.draft.update(d => d ? { ...d, ...change } : d); }

  protected setOption(id: string, text: string): void {
    this.draft.update(d => d ? { ...d, options: d.options.map(o => o.id === id ? { ...o, text } : o) } : d);
  }

  protected addOption(): void {
    this.draft.update(d => {
      if (!d) return d;
      const id = String.fromCharCode(97 + d.options.length);
      return { ...d, options: [...d.options, { id, text: '' }] };
    });
  }

  protected removeOption(id: string): void {
    this.draft.update(d => d ? {
      ...d, options: d.options.filter(o => o.id !== id), correctAnswers: d.correctAnswers.filter(c => c !== id),
    } : d);
  }

  protected toggleCorrect(id: string): void {
    this.draft.update(d => {
      if (!d) return d;
      if (!d.allowMultiple) return { ...d, correctAnswers: [id] };
      const has = d.correctAnswers.includes(id);
      return { ...d, correctAnswers: has ? d.correctAnswers.filter(c => c !== id) : [...d.correctAnswers, id] };
    });
  }

  protected save(): void {
    const d = this.draft();
    if (!d || this.draftProblem() || this.saving()) return;
    const question = toQuestion(d);
    this.saving.set(true);
    const request = d.id ? this.bank.update(d.id, d.category.trim(), question) : this.bank.create(d.category.trim(), question);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.draft.set(null);
        this.toast.success(d.id ? 'Pregunta actualizada' : 'Pregunta agregada al banco');
        this.loadCategories();
        this.load();
      },
      error: err => {
        this.saving.set(false);
        this.toast.error(err?.error?.message ?? 'No se pudo guardar la pregunta');
      },
    });
  }

  protected confirmDelete(item: IBankQuestion): void { this.pendingDelete.set(item); }

  protected executeDelete(): void {
    const item = this.pendingDelete();
    if (!item) return;
    this.deleting.set(true);
    this.bank.delete(item.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.pendingDelete.set(null);
        this.toast.success('Pregunta eliminada');
        this.loadCategories();
        this.load();
      },
      error: () => { this.deleting.set(false); this.toast.error('No se pudo eliminar la pregunta'); },
    });
  }

  protected optionText(item: IBankQuestion, id: string): string {
    return (item.question as any).options?.find((o: { id: string }) => o.id === id)?.text ?? id;
  }

  protected answerSummary(item: IBankQuestion): string {
    const q = item.question as any;
    if (item.type === 'true-false') return q.correctAnswer ? 'Verdadero' : 'Falso';
    if (item.type === 'multiple-choice') return (q.correctAnswers ?? []).map((id: string) => this.optionText(item, id)).join(', ');
    return 'Respuesta abierta (no se califica automáticamente)';
  }
}

function toQuestion(d: IDraft): IQuestion {
  const base = { id: d.id ?? 'new', question: d.question.trim(), points: d.points > 0 ? d.points : 1, order: 1,
    explanation: d.explanation.trim() || undefined };
  if (d.type === 'multiple-choice') {
    const options = d.options.filter(o => o.text.trim()).map(o => ({ id: o.id, text: o.text.trim() }));
    return { ...base, type: 'multiple-choice', options, allowMultiple: d.allowMultiple,
      correctAnswers: d.correctAnswers.filter(id => options.some(o => o.id === id)) } as IQuestion;
  }
  if (d.type === 'true-false') return { ...base, type: 'true-false', correctAnswer: d.correctBoolean } as IQuestion;
  return { ...base, type: 'open', sampleAnswer: d.sampleAnswer.trim() || undefined } as IQuestion;
}
