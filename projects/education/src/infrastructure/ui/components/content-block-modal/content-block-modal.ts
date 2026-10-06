import { Component, inject, input, output, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MarkdownEditorComponent } from 'shared';
import {
  EContentType,
  ICreateContentBlockRequest,
  IQuestion,
  IMultipleChoiceQuestion,
  ITrueFalseQuestion,
  IOpenQuestion,
  IRubricItem,
  IQuestionPool
} from '../../../../domain/model/course.model';
import { QuestionBankService } from '../../../services/question-bank.service';
import type { IBankCategory } from '../../../services/question-bank.service';
import { FileUploadService } from 'shared';
import { LibSelectComponent, SelectOption } from 'shared';

type TStep = 'type-select' | 'form';

interface IQuestionDraft {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'open';
  question: string;
  points: number;
  order: number;
  explanation: string;
  options: { id: string; text: string }[];
  correctAnswers: string[];
  allowMultiple: boolean;
  correctBoolean: boolean;
  sampleAnswer: string;
}

interface IRubricDraft {
  id: string;
  criterion: string;
  maxPoints: number;
}

const newQuestion = (order: number): IQuestionDraft => ({
  id: `q-${Date.now()}-${order}`,
  type: 'multiple-choice',
  question: '',
  points: 10,
  order,
  explanation: '',
  options: [{ id: 'a', text: '' }, { id: 'b', text: '' }],
  correctAnswers: [],
  allowMultiple: false,
  correctBoolean: true,
  sampleAnswer: ''
});

@Component({
  selector: 'edu-content-block-modal',
  standalone: true,
  imports: [LibSelectComponent, CommonModule, FormsModule, MarkdownEditorComponent],
  templateUrl: './content-block-modal.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './content-block-modal.scss'
})
export class ContentBlockModal {
  private readonly fileUpload = inject(FileUploadService);
  protected readonly scormOptions: SelectOption[] = [
    { value: '1.2', label: 'SCORM 1.2' },
    { value: '2004', label: 'SCORM 2004' },
  ];
  protected readonly questionTypeOptions: SelectOption[] = [
    { value: 'multiple-choice', label: 'Opción múltiple' },
    { value: 'true-false', label: 'Verdadero / falso' },
    { value: 'open', label: 'Respuesta abierta' },
  ];
  protected readonly bankCategoryOptions = computed<SelectOption[]>(() =>
    this.bankCategories().map(c => ({ value: c.category, label: c.category, hint: `${c.count} preguntas` })));
  private readonly sanitizer = inject(DomSanitizer);
  private readonly bank = inject(QuestionBankService);

  readonly lessonId = input.required<string>();
  readonly onClose  = output<void>();
  readonly onSave   = output<ICreateContentBlockRequest>();

  readonly EContentType = EContentType;

  readonly step         = signal<TStep>('type-select');
  readonly selectedType = signal<EContentType | null>(null);

  readonly title       = signal('');
  readonly description = signal('');
  readonly duration    = signal(0);
  readonly isRequired  = signal(true);

  readonly videoProvider     = signal<'youtube' | 'vimeo' | 'external' | 'upload'>('youtube');
  readonly videoUrl          = signal('');
  readonly videoThumbnailUrl = signal('');
  readonly videoTranscript   = signal('');
  readonly captionsUrl       = signal('');
  readonly captionsBusy      = signal(false);
  readonly captionsError     = signal<string | null>(null);

  readonly markdownContent = signal('');
  readonly markdownPreview = signal(false);

  readonly scormUrl             = signal('');
  readonly scormVersion         = signal<'1.2' | '2004'>('1.2');
  readonly completionThreshold  = signal(80);

  readonly quizTimeLimit    = signal(0);
  readonly quizPassingScore = signal(70);
  readonly quizMaxAttempts  = signal(3);
  readonly quizShuffle      = signal(false);
  readonly quizQuestions    = signal<IQuestionDraft[]>([newQuestion(1)]);
  /** Random questions per attempt from the question bank. */
  readonly quizPools        = signal<IQuestionPool[]>([]);
  readonly bankCategories   = signal<IBankCategory[]>([]);
  readonly bankError        = signal<string | null>(null);

  readonly assignmentInstructions = signal('');
  readonly maxScore               = signal(100);
  readonly dueDate                = signal('');
  readonly allowedFileTypes       = signal<string[]>(['pdf', 'docx']);
  readonly rubric                 = signal<IRubricDraft[]>([{ id: 'r1', criterion: '', maxPoints: 100 }]);
  readonly newFileType            = signal('');

  readonly contentTypes = [
    { type: EContentType.VIDEO,        label: 'Video',          desc: 'YouTube, Vimeo o archivo',                 icon: 'video' },
    { type: EContentType.DOCUMENT,     label: 'Markdown',       desc: 'Texto enriquecido con formato',            icon: 'doc'   },
    { type: EContentType.QUIZ,         label: 'Evaluación',     desc: 'Preguntas con calificación automática',    icon: 'quiz'  },
    { type: EContentType.ASSIGNMENT,   label: 'Tarea',          desc: 'Entrega de archivos o texto',              icon: 'task'  },
    { type: EContentType.SCORM,        label: 'SCORM',          desc: 'Paquete e-learning estándar',              icon: 'scorm' },
    { type: EContentType.LIVE_SESSION, label: 'Sesión en Vivo', desc: 'Clase o webinar sincrónico',               icon: 'live'  }
  ] as const;

  readonly canSave = computed(() => {
    const t = this.title().trim();
    if (!t) return false;
    const type = this.selectedType();
    if (type === EContentType.VIDEO)      return !!this.videoUrl().trim();
    if (type === EContentType.SCORM)      return !!this.scormUrl().trim();
    if (type === EContentType.QUIZ) {
      const pools = this.validPools();
      return (this.quizQuestions().length > 0 || pools.length > 0)
        && this.quizQuestions().every(q => q.question.trim().length > 0);
    }
    if (type === EContentType.ASSIGNMENT) return !!this.assignmentInstructions().trim();
    return true;
  });

  readonly validPools = computed(() => this.quizPools().filter(p => p.category && p.count > 0));
  readonly pooledQuestionCount = computed(() => this.validPools().reduce((a, p) => a + p.count, 0));

  readonly totalQuizPoints = computed(() => this.quizQuestions().reduce((s, q) => s + q.points, 0));

  readonly youtubePreviewId = computed(() => {
    if (this.videoProvider() !== 'youtube') return '';
    const match = this.videoUrl().match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^?&]+)/);
    return match ? match[1] : '';
  });

  readonly youtubeEmbedUrl = computed((): SafeResourceUrl | null => {
    const id = this.youtubePreviewId();
    if (!id) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${id}`);
  });

  selectType(type: EContentType): void {
    this.selectedType.set(type);
    this.step.set('form');
    if (type === EContentType.QUIZ) this.loadBankCategories();
  }

  private loadBankCategories(): void {
    this.bankError.set(null);
    this.bank.categories().subscribe({
      next: list => this.bankCategories.set(list),
      error: () => this.bankError.set('No se pudo cargar el banco de preguntas'),
    });
  }

  addPool(): void {
    const first = this.bankCategories()[0]?.category ?? '';
    this.quizPools.update(p => [...p, { category: first, count: 1 }]);
  }
  removePool(index: number): void { this.quizPools.update(p => p.filter((_, i) => i !== index)); }
  updatePool(index: number, patch: Partial<IQuestionPool>): void {
    this.quizPools.update(p => p.map((pool, i) => i === index ? { ...pool, ...patch } : pool));
  }
  poolAvailable(category: string): number {
    return this.bankCategories().find(c => c.category === category)?.count ?? 0;
  }
  back():  void { this.step.set('type-select'); this.selectedType.set(null); }
  close(): void { this.onClose.emit(); }

  getTypeLabel(type: EContentType | null): string { return this.contentTypes.find(ct => ct.type === type)?.label ?? ''; }

  save(): void {
    if (!this.canSave()) return;
    const type = this.selectedType()!;
    const req: ICreateContentBlockRequest = {
      lessonId: this.lessonId(), type,
      title: this.title().trim(),
      description: this.description().trim() || undefined,
      duration: this.duration(),
      isRequired: this.isRequired()
    };
    if (type === EContentType.VIDEO) {
      req.url = this.videoUrl().trim();
      req.videoProvider = this.videoProvider();
      req.videoThumbnailUrl = this.videoThumbnailUrl().trim() || undefined;
      req.videoTranscript   = this.videoTranscript().trim() || undefined;
      req.captionsUrl       = this.captionsUrl().trim() || undefined;
    }
    if (type === EContentType.DOCUMENT) { req.markdownContent = this.markdownContent(); }
    if (type === EContentType.SCORM) {
      req.url = this.scormUrl().trim();
      req.scormVersion        = this.scormVersion();
      req.completionThreshold = this.completionThreshold();
    }
    if (type === EContentType.QUIZ) {
      req.timeLimit        = this.quizTimeLimit();
      req.passingScore     = this.quizPassingScore();
      req.maxAttempts      = this.quizMaxAttempts();
      req.shuffleQuestions = this.quizShuffle();
      req.questions        = this.quizQuestions().map(q => this.draftToQuestion(q));
      const pools = this.validPools();
      if (pools.length) req.questionPools = pools.map(p => ({ category: p.category, count: Math.floor(p.count) }));
    }
    if (type === EContentType.ASSIGNMENT) {
      req.assignmentInstructions = this.assignmentInstructions();
      req.maxScore               = this.maxScore();
      req.dueDate                = this.dueDate() || undefined;
      req.allowedFileTypes       = [...this.allowedFileTypes()];
      req.rubric                 = this.rubric().filter(r => r.criterion.trim()).map(r => ({ id: r.id, criterion: r.criterion, maxPoints: r.maxPoints }));
    }
    this.onSave.emit(req);
  }

  private draftToQuestion(d: IQuestionDraft): IQuestion {
    if (d.type === 'multiple-choice') return { id: d.id, type: 'multiple-choice', question: d.question, points: d.points, order: d.order, explanation: d.explanation || undefined, options: d.options.filter(o => o.text.trim()), correctAnswers: d.correctAnswers, allowMultiple: d.allowMultiple } as IMultipleChoiceQuestion;
    if (d.type === 'true-false')      return { id: d.id, type: 'true-false',       question: d.question, points: d.points, order: d.order, explanation: d.explanation || undefined, correctAnswer: d.correctBoolean } as ITrueFalseQuestion;
    return { id: d.id, type: 'open', question: d.question, points: d.points, order: d.order, explanation: d.explanation || undefined, sampleAnswer: d.sampleAnswer || undefined } as IOpenQuestion;
  }

  addQuestion():  void { const qs = this.quizQuestions(); this.quizQuestions.set([...qs, newQuestion(qs.length + 1)]); }
  removeQuestion(id: string): void { this.quizQuestions.update(qs => qs.filter(q => q.id !== id).map((q, i) => ({ ...q, order: i + 1 }))); }
  updateQuestion(id: string, patch: Partial<IQuestionDraft>): void { this.quizQuestions.update(qs => qs.map(q => q.id === id ? { ...q, ...patch } : q)); }

  addOption(questionId: string): void {
    this.quizQuestions.update(qs => qs.map(q => {
      if (q.id !== questionId) return q;
      const letters = ['a', 'b', 'c', 'd', 'e', 'f'];
      const id = letters[q.options.length] ?? `opt${q.options.length}`;
      return { ...q, options: [...q.options, { id, text: '' }] };
    }));
  }

  updateOption(questionId: string, optionId: string, text: string): void {
    this.quizQuestions.update(qs => qs.map(q => q.id !== questionId ? q : { ...q, options: q.options.map(o => o.id === optionId ? { ...o, text } : o) }));
  }

  removeOption(questionId: string, optionId: string): void {
    this.quizQuestions.update(qs => qs.map(q => q.id !== questionId ? q : { ...q, options: q.options.filter(o => o.id !== optionId), correctAnswers: q.correctAnswers.filter(id => id !== optionId) }));
  }

  toggleCorrectAnswer(questionId: string, optionId: string, allowMultiple: boolean): void {
    this.quizQuestions.update(qs => qs.map(q => {
      if (q.id !== questionId) return q;
      const already = q.correctAnswers.includes(optionId);
      const correctAnswers = allowMultiple ? (already ? q.correctAnswers.filter(id => id !== optionId) : [...q.correctAnswers, optionId]) : [optionId];
      return { ...q, correctAnswers };
    }));
  }

  addRubricItem():  void { this.rubric.update(r => [...r, { id: `r${Date.now()}`, criterion: '', maxPoints: 20 }]); }
  removeRubricItem(id: string): void { this.rubric.update(r => r.filter(i => i.id !== id)); }
  updateRubricItem(id: string, patch: Partial<IRubricDraft>): void { this.rubric.update(r => r.map(i => i.id === id ? { ...i, ...patch } : i)); }

  addFileType(): void {
    const t = this.newFileType().trim().toLowerCase().replace(/^\./, '');
    if (!t || this.allowedFileTypes().includes(t)) return;
    this.allowedFileTypes.update(ft => [...ft, t]);
    this.newFileType.set('');
  }
  removeFileType(ft: string): void { this.allowedFileTypes.update(list => list.filter(t => t !== ft)); }

  trackById(_: number, item: { id: string }): string { return item.id; }

  /** Subtítulos WebVTT: se guardan como archivo público para que el reproductor los cargue. */
  protected onCaptionsFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!/\.vtt$/i.test(file.name)) { this.captionsError.set('Usa un archivo de subtítulos .vtt (WebVTT).'); return; }
    this.captionsBusy.set(true);
    this.captionsError.set(null);
    const vtt = new File([file], file.name, { type: 'text/vtt' });
    this.fileUpload.upload(vtt, 'public').subscribe({
      next: f => { this.captionsBusy.set(false); this.captionsUrl.set(f.url); },
      error: () => { this.captionsBusy.set(false); this.captionsError.set('No se pudieron subir los subtítulos.'); },
    });
  }
}
