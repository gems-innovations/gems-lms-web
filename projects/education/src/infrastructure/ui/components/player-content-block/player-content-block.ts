import {
  Component, inject, input, output, signal, computed, effect,
  OnChanges, SimpleChanges, ChangeDetectionStrategy, OnDestroy, HostListener
} from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MarkdownComponent } from 'ngx-markdown';
import {
  IContentBlock, EContentType, IQuestion, IMultipleChoiceQuestion, ITrueFalseQuestion, IOpenQuestion
} from '../../../../domain/model/course.model';
import { IQuizAnswer } from '../../../../domain/model/enrollment.model';
import {
  IQuizSubmitPayload, IAssignmentSubmitPayload, IQuizResult,
  IAssignmentSubmission
} from '../../../../domain/model/player.model';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/msword': 'Word',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
  'application/vnd.ms-excel': 'Excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
  'application/vnd.ms-powerpoint': 'PowerPoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
  'text/plain': 'Texto',
  'image/jpeg': 'Imagen', 'image/png': 'Imagen', 'image/gif': 'Imagen',
  'image/webp': 'Imagen', 'image/svg+xml': 'Imagen',
  'video/mp4': 'Video', 'video/webm': 'Video', 'video/quicktime': 'Video',
  'audio/mpeg': 'Audio', 'audio/wav': 'Audio', 'audio/ogg': 'Audio',
};

type QuizPhase = 'confirm' | 'taking' | 'result';

@Component({
  selector: 'edu-player-content-block',
  standalone: true,
  imports: [DecimalPipe, DatePipe, FormsModule, MarkdownComponent],
  templateUrl: './player-content-block.html',
  styleUrl: './player-content-block.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerContentBlock implements OnChanges, OnDestroy {
  private readonly sanitizer = inject(DomSanitizer);

  // ── Inputs ────────────────────────────────────────────────────────────────
  readonly block              = input.required<IContentBlock | null>();
  readonly courseId           = input<string | null>(null);
  readonly lessonId           = input<string | null>(null);
  readonly isSubmitting       = input<boolean>(false);
  readonly lastQuizResult     = input<IQuizResult | null>(null);
  readonly isComplete         = input<boolean>(false);
  readonly isLocked           = input<boolean>(false);
  readonly assignmentSubmission = input<IAssignmentSubmission | null>(null);

  // ── Outputs ───────────────────────────────────────────────────────────────
  readonly quizSubmit        = output<IQuizSubmitPayload>();
  readonly assignmentSubmit  = output<IAssignmentSubmitPayload>();
  readonly markComplete      = output<void>();

  protected readonly EContentType = EContentType;

  // ── Reading timer ──────────────────────────────────────────────────────────
  private _readingTimer: ReturnType<typeof setInterval> | null = null;
  private _readingPaused = false;

  protected readonly readingElapsed  = signal(0);
  protected readonly readingRequired = computed(() => {
    const block = this.block();
    if (!block || block.type !== EContentType.DOCUMENT) return 0;
    const words = (block.markdownContent ?? '').trim().split(/\s+/).filter(Boolean).length;
    return Math.max(15, Math.round((words / 200) * 60));
  });
  protected readonly readingPct = computed(() => {
    const req = this.readingRequired();
    return req ? Math.min(100, Math.round((this.readingElapsed() / req) * 100)) : 0;
  });
  protected readonly readingRemaining = computed(() =>
    Math.max(0, this.readingRequired() - this.readingElapsed())
  );

  // ── Video ─────────────────────────────────────────────────────────────────
  protected readonly videoEmbedUrl = computed((): SafeResourceUrl | null => {
    const block = this.block();
    if (!block || block.type !== EContentType.VIDEO || !block.url) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.resolveVideoUrl(block));
  });

  // ── Assignment state ───────────────────────────────────────────────────────
  protected readonly assignmentText      = signal('');
  protected readonly assignmentSubmitted = signal(false);
  protected readonly attachedFile        = signal<File | null>(null);
  protected readonly fileError           = signal<string | null>(null);
  protected readonly canSubmitAssignment = computed(() =>
    this.assignmentText().trim().length > 0 || this.attachedFile() !== null
  );

  // ── Quiz state ─────────────────────────────────────────────────────────────
  protected readonly quizPhase        = signal<QuizPhase>('confirm');
  protected readonly currentQIdx      = signal(0);
  protected readonly quizAnswers      = signal<Record<string, string | string[] | boolean>>({});
  protected readonly quizBookmarks    = signal<Record<string, boolean>>({});
  protected readonly timerSeconds     = signal(0);
  protected readonly timerStartedAt   = signal<number | null>(null);
  private _timerInterval: ReturnType<typeof setInterval> | null = null;

  protected readonly quizQuestions = computed(() =>
    (this.block()?.questions ?? []) as IQuestion[]
  );

  protected readonly currentQuestion = computed(() =>
    this.quizQuestions()[this.currentQIdx()] ?? null
  );

  protected readonly answeredCount = computed(() => {
    const answers = this.quizAnswers();
    return this.quizQuestions().filter(q => {
      const a = answers[q.id];
      if (a === undefined || a === null || a === '') return false;
      if (Array.isArray(a)) return a.length > 0;
      return true;
    }).length;
  });

  protected readonly allAnswered = computed(() =>
    this.answeredCount() === this.quizQuestions().length
  );

  protected readonly timeLimitSeconds = computed(() =>
    (this.block()?.timeLimit ?? 0) * 60
  );

  protected readonly timerDisplay = computed(() => {
    const limit = this.timeLimitSeconds();
    const elapsed = this.timerSeconds();
    const remaining = limit > 0 ? Math.max(0, limit - elapsed) : elapsed;
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  });

  protected readonly timerWarning = computed(() => {
    const limit = this.timeLimitSeconds();
    if (!limit) return false;
    return (limit - this.timerSeconds()) <= 60;
  });

  protected readonly quizAttempts = computed(() => {
    const result = this.lastQuizResult() as any;
    return result ? (result.attemptNumber ?? 0) : 0;
  });

  protected readonly quizAttemptsLeft = computed(() => {
    const block = this.block();
    if (!block || block.type !== EContentType.QUIZ) return 0;
    const max = block.maxAttempts ?? 0;
    if (max === 0) return Infinity;
    return Math.max(0, max - this.quizAttempts());
  });

  protected readonly canRetryQuiz = computed(() => {
    return this.quizAttemptsLeft() > 0;
  });

  constructor() {
    // Stop reading timer when block is marked complete externally
    effect(() => {
      if (this.isComplete()) this._stopReadingTimer();
    });
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['block']) {
      this.resetQuiz();
      this.assignmentText.set('');
      this.assignmentSubmitted.set(false);
      this.attachedFile.set(null);
      this.fileError.set(null);
      this._stopReadingTimer();
      this.readingElapsed.set(0);
      const block = this.block();
      if (block?.type === EContentType.DOCUMENT && !this.isComplete() && !this.isLocked()) {
        this._startReadingTimer();
      }
    }
  }

  ngOnDestroy(): void {
    this.stopTimer();
    this._stopReadingTimer();
  }

  // ── Video end detection (YouTube / Vimeo via postMessage) ──────────────────
  @HostListener('window:message', ['$event'])
  onWindowMessage(event: MessageEvent): void {
    if (this.isComplete() || this.isLocked()) return;
    const block = this.block();
    if (!block || block.type !== EContentType.VIDEO) return;
    try {
      const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      if (!data || typeof data !== 'object') return;
      // YouTube: state 0 = ended
      if (data.event === 'onStateChange' && data.info === 0) { this.markComplete.emit(); return; }
      if (data.event === 'infoDelivery' && data.info?.playerState === 0) { this.markComplete.emit(); return; }
      // Vimeo: finish event
      if (data.event === 'finish') { this.markComplete.emit(); }
    } catch { /* ignore non-JSON messages */ }
  }

  // ── Reading timer pause when tab is hidden ─────────────────────────────────
  @HostListener('document:visibilitychange')
  onVisibilityChange(): void {
    this._readingPaused = document.hidden;
  }

  // ── Quiz actions ───────────────────────────────────────────────────────────
  protected startQuiz(): void {
    if (!this.canRetryQuiz()) return;
    this.quizPhase.set('taking');
    this.currentQIdx.set(0);
    this.startTimer();
  }

  protected goToQuestion(idx: number): void {
    const total = this.quizQuestions().length;
    if (idx >= 0 && idx < total) this.currentQIdx.set(idx);
  }

  protected setAnswer(questionId: string, value: string | string[] | boolean): void {
    this.quizAnswers.update(a => ({ ...a, [questionId]: value }));
  }

  protected toggleMultiAnswer(questionId: string, optionId: string): void {
    const current = (this.quizAnswers()[questionId] as string[]) ?? [];
    const updated = current.includes(optionId)
      ? current.filter(id => id !== optionId)
      : [...current, optionId];
    this.setAnswer(questionId, updated);
  }

  protected getAnswer(questionId: string): string | string[] | boolean | undefined {
    return this.quizAnswers()[questionId];
  }

  protected isOptionChecked(questionId: string, optionId: string): boolean {
    const a = this.getAnswer(questionId);
    return Array.isArray(a) ? a.includes(optionId) : a === optionId;
  }

  protected toggleBookmark(questionId: string): void {
    this.quizBookmarks.update(b => ({ ...b, [questionId]: !b[questionId] }));
  }

  protected isQuestionBookmarked(questionId: string): boolean {
    return !!this.quizBookmarks()[questionId];
  }

  protected isQuestionAnswered(questionId: string): boolean {
    const a = this.quizAnswers()[questionId];
    if (a === undefined || a === null || a === '') return false;
    if (Array.isArray(a)) return a.length > 0;
    return true;
  }

  protected submitQuiz(): void {
    const block = this.block();
    const cid   = this.courseId();
    const lid   = this.lessonId();
    if (!block || !cid || !lid) return;
    const elapsed = this.timerSeconds();
    this.stopTimer();
    const answers: IQuizAnswer[] = this.quizQuestions().map(q => ({
      questionId: q.id,
      answer: this.quizAnswers()[q.id] ?? ''
    }));
    this.quizSubmit.emit({ blockId: block.id, lessonId: lid, courseId: cid, answers });
    this.quizPhase.set('result');
  }

  protected retryQuiz(): void {
    if (!this.canRetryQuiz()) return;
    this.resetQuiz();
    this.quizPhase.set('confirm');
  }

  private resetQuiz(): void {
    this.stopTimer();
    if (this.lastQuizResult()) {
      this.quizPhase.set('result');
    } else {
      this.quizPhase.set('confirm');
    }
    this.currentQIdx.set(0);
    this.quizAnswers.set({});
    this.quizBookmarks.set({});
    this.timerSeconds.set(0);
    this.timerStartedAt.set(null);
  }

  private startTimer(): void {
    this.stopTimer();
    this.timerSeconds.set(0);
    this.timerStartedAt.set(Date.now());
    this._timerInterval = setInterval(() => {
      this.timerSeconds.update(s => s + 1);
      const limit = this.timeLimitSeconds();
      if (limit > 0 && this.timerSeconds() >= limit) this.submitQuiz();
    }, 1000);
  }

  private stopTimer(): void {
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    }
  }

  // ── Assignment actions ─────────────────────────────────────────────────────
  protected onFileSelect(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.fileError.set(null);
    if (!file) { this.attachedFile.set(null); return; }
    if (!ALLOWED_TYPES[file.type]) {
      this.fileError.set('Tipo de archivo no permitido.');
      (event.target as HTMLInputElement).value = '';
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      this.fileError.set('El archivo supera el límite de 10 MB.');
      (event.target as HTMLInputElement).value = '';
      return;
    }
    this.attachedFile.set(file);
  }

  protected removeFile(): void { this.attachedFile.set(null); this.fileError.set(null); }

  protected formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  protected submitAssignment(): void {
    const block = this.block();
    const cid   = this.courseId();
    const lid   = this.lessonId();
    if (!block || !this.canSubmitAssignment() || !cid || !lid) return;
    this.assignmentSubmit.emit({
      blockId: block.id, lessonId: lid, courseId: cid,
      textContent: this.assignmentText(),
      attachedFile: this.attachedFile() ?? undefined,
    });
    this.assignmentSubmitted.set(true);
  }

  protected gradePercent(grade: { score: number; maxScore: number }): number {
    return grade.maxScore > 0 ? Math.round((grade.score / grade.maxScore) * 100) : 0;
  }

  protected gradeLabel(pct: number): string {
    if (pct >= 90) return 'Excelente';
    if (pct >= 75) return 'Aprobado';
    if (pct >= 60) return 'Aceptable';
    return 'Por mejorar';
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  protected asMCQ(q: IQuestion): IMultipleChoiceQuestion { return q as IMultipleChoiceQuestion; }
  protected asTF(q: IQuestion):  ITrueFalseQuestion       { return q as ITrueFalseQuestion; }
  protected asOpen(q: IQuestion): IOpenQuestion           { return q as IOpenQuestion; }

  private _startReadingTimer(): void {
    this._stopReadingTimer();
    this._readingPaused = document.hidden;
    this._readingTimer = setInterval(() => {
      if (this._readingPaused || this.isComplete()) return;
      this.readingElapsed.update(s => s + 1);
      if (this.readingElapsed() >= this.readingRequired()) {
        this._stopReadingTimer();
        this.markComplete.emit();
      }
    }, 1000);
  }

  private _stopReadingTimer(): void {
    if (this._readingTimer) { clearInterval(this._readingTimer); this._readingTimer = null; }
  }

  private resolveVideoUrl(block: IContentBlock): string {
    const url = block.url!;
    if (url.includes('/embed/') || url.includes('player.vimeo')) return url;
    if (url.includes('youtube') || url.includes('youtu.be') || block.videoProvider === 'youtube') {
      const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^?&]+)/);
      const id = match?.[1] ?? '';
      return id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&enablejsapi=1` : url;
    }
    if (url.includes('vimeo') || block.videoProvider === 'vimeo') {
      const match = url.match(/vimeo\.com\/(\d+)/);
      const id = match?.[1] ?? '';
      return id ? `https://player.vimeo.com/video/${id}?title=0&byline=0&api=1` : url;
    }
    return url;
  }
}
