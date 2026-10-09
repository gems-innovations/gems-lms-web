import {
  Component, inject, input, output, signal, computed, effect, untracked,
  OnChanges, SimpleChanges, ChangeDetectionStrategy, OnDestroy, HostListener
} from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MarkdownComponent } from 'ngx-markdown';
import { MarkdownEditorComponent } from 'shared';
import {
  IContentBlock, EContentType, IQuestion, IMultipleChoiceQuestion, ITrueFalseQuestion, IOpenQuestion
} from '../../../../domain/model/course.model';
import { IQuizAnswer } from '../../../../domain/model/enrollment.model';
import { QuizSessionService } from '../../../services/quiz-session.service';
import { toVideoEmbedUrl } from '../../../../application/video-embed';
import {
  IQuizSubmitPayload, IAssignmentSubmitPayload, IQuizResult,
  IAssignmentSubmission
} from '../../../../domain/model/player.model';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** Only the embedded players may tell us that a video ended. */
const VIDEO_PLAYER_ORIGINS = new Set(['https://www.youtube.com', 'https://www.youtube-nocookie.com', 'https://player.vimeo.com']);

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
  imports: [DecimalPipe, DatePipe, FormsModule, MarkdownComponent, MarkdownEditorComponent],
  templateUrl: './player-content-block.html',
  styleUrl: './player-content-block.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerContentBlock implements OnChanges, OnDestroy {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly quizSessions = inject(QuizSessionService);

  // ── Inputs ────────────────────────────────────────────────────────────────
  readonly block              = input.required<IContentBlock | null>();
  readonly courseId           = input<string | null>(null);
  readonly lessonId           = input<string | null>(null);
  readonly isSubmitting       = input<boolean>(false);
  readonly lastQuizResult     = input<IQuizResult | null>(null);
  readonly isComplete           = input<boolean>(false);
  readonly isLocked             = input<boolean>(false);
  readonly assignmentSubmission = input<IAssignmentSubmission | null>(null);
  readonly quizAttemptCount     = input<number>(0);
  readonly forceSubmitTrigger   = input<number>(0);
  /** Sube cada vez que el estudiante toca «Siguiente» sin haber terminado este paso: se le explica por qué no avanza. */
  readonly nudge                = input<number>(0);

  // ── Outputs ───────────────────────────────────────────────────────────────
  readonly quizSubmit        = output<IQuizSubmitPayload>();
  readonly assignmentSubmit  = output<IAssignmentSubmitPayload>();
  /** Completa el bloque y pasa al siguiente (videos terminados, botones explícitos). */
  readonly markComplete      = output<void>();
  /** El tiempo de lectura se cumplió: el bloque queda completo, pero el estudiante sigue leyendo donde está. */
  readonly readingDone       = output<void>();
  /** Botón «Siguiente paso» al pie del contenido. */
  readonly goNext            = output<void>();
  readonly quizPhaseChange   = output<QuizPhase>();
  readonly quizForceSubmitted = output<void>();

  // ── Aviso al tocar «Siguiente» antes de tiempo ────────────────────────────
  protected readonly nudged = signal(false);
  private _nudgeTimeout: ReturnType<typeof setTimeout> | null = null;
  protected readonly nudgeText = computed(() => {
    const block = this.block();
    switch (block?.type) {
      case EContentType.DOCUMENT: return this.readingRemaining() > 0
        ? `Todavía no: te faltan ${this.readingClock()} de lectura para habilitar el siguiente paso.`
        : 'Un momento, estamos guardando tu lectura…';
      case EContentType.QUIZ: return 'Para seguir, responde y entrega este quiz.';
      case EContentType.VIDEO: return 'Para seguir, termina de ver el video.';
      case EContentType.ASSIGNMENT: return 'Para seguir, envía la tarea.';
      default: return 'Termina este paso para seguir.';
    }
  });

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
  /** Tiempo restante en formato legible: «45 s» o «1:20 min». */
  protected readonly readingClock = computed(() => {
    const s = this.readingRemaining();
    return s < 60 ? `${s} s` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} min`;
  });

  // ── Video ─────────────────────────────────────────────────────────────────
  protected readonly videoEmbedUrl = computed((): SafeResourceUrl | null => {
    const block = this.block();
    if (!block || block.type !== EContentType.VIDEO || !block.url || this.directVideo()) return null;
    const embed = toVideoEmbedUrl(block.url);
    return embed ? this.sanitizer.bypassSecurityTrustResourceUrl(embed) : null;
  });

  /** Uploaded or external video files play in <video>, with subtitles and keyboard controls. */
  protected readonly directVideo = computed(() => {
    const block = this.block();
    if (!block || block.type !== EContentType.VIDEO || !block.url) return null;
    const url = block.url;
    const hosted = /youtube|youtu\.be|vimeo/.test(url) || block.videoProvider === 'youtube' || block.videoProvider === 'vimeo';
    const file = block.videoProvider === 'upload' || /\/files\/(public\/)?[\w-]+$|\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
    return !hosted && file ? url : null;
  });

  // ── Assignment state ───────────────────────────────────────────────────────
  protected readonly assignmentText      = signal('');
  protected readonly assignmentSubmitted = signal(false);
  protected readonly assignmentEditing   = signal(false);
  protected readonly attachedFile        = signal<File | null>(null);
  protected readonly fileError           = signal<string | null>(null);
  protected readonly canSubmitAssignment = computed(() =>
    this.assignmentText().trim().length > 0 || this.attachedFile() !== null
  );
  protected readonly assignmentIsPending = computed(() => {
    const sub = this.assignmentSubmission();
    return !!sub && sub.status === 'pending_review' && !sub.grade;
  });
  protected readonly assignmentIsGraded = computed(() => {
    const sub = this.assignmentSubmission();
    return !!sub && (sub.status === 'graded' || !!sub.grade);
  });

  // ── Quiz state ─────────────────────────────────────────────────────────────
  protected readonly quizPhase         = signal<QuizPhase>('confirm');
  protected readonly currentQIdx       = signal(0);
  protected readonly quizAnswers       = signal<Record<string, string | string[] | boolean>>({});
  protected readonly quizBookmarks     = signal<Record<string, boolean>>({});
  protected readonly timerSeconds      = signal(0);
  protected readonly timerStartedAt    = signal<number | null>(null);
  protected readonly showSubmitConfirm = signal(false);
  private readonly _attemptQuestions   = signal<IQuestion[]>([]);
  /** Attempt started on the server; its questions and deadline are fixed there. */
  private readonly _sessionId          = signal<string | null>(null);
  /** Seconds left when the attempt (re)started, by the server clock; null = untimed. */
  private readonly _sessionLimit       = signal<number | null>(null);
  protected readonly quizStarting      = signal(false);
  protected readonly quizStartError    = signal<string | null>(null);
  private readonly _submittedAnswers   = signal<Record<string, string | string[] | boolean>>({});
  private _timerInterval: ReturnType<typeof setInterval> | null = null;

  protected readonly quizQuestions = computed(() => {
    const phase = this.quizPhase();
    const attempt = this._attemptQuestions();
    if ((phase === 'taking' || phase === 'result') && attempt.length) return attempt;
    return ((this.block()?.questions ?? []) as IQuestion[]).filter(q => q.type !== 'open');
  });

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
    this._sessionLimit() ?? (this.block()?.timeLimit ?? 0) * 60
  );

  /** Questions announced before starting: the block's own (not open) plus those drawn from the bank. */
  protected readonly plannedQuestionCount = computed(() => {
    const block = this.block();
    const own = ((block?.questions ?? []) as IQuestion[]).filter(q => q.type !== 'open').length;
    return own + (block?.questionPools ?? []).reduce((a, p) => a + (p.count > 0 ? p.count : 0), 0);
  });

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

  protected readonly quizAttempts = computed(() => this.quizAttemptCount());

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

    // «Siguiente» antes de tiempo: se muestra el motivo unos segundos y se lleva la vista al aviso.
    effect(() => {
      if (this.nudge() <= 0) return;
      this.nudged.set(true);
      if (this._nudgeTimeout) clearTimeout(this._nudgeTimeout);
      this._nudgeTimeout = setTimeout(() => this.nudged.set(false), 4000);
      setTimeout(() => document.querySelector('.pcb-gate, .pcb-nudge')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    });

    // Notify container when quiz phase changes
    effect(() => {
      this.quizPhaseChange.emit(this.quizPhase());
    });

    // Force-submit quiz when container requests it (e.g. student navigates away).
    // Each trigger value is handled once: otherwise a later retry would be auto-submitted
    // the moment it starts, because the counter stays above 0.
    let handledTrigger = 0;
    effect(() => {
      const trigger = this.forceSubmitTrigger();
      if (trigger > handledTrigger && untracked(() => this.quizPhase()) === 'taking') {
        handledTrigger = trigger;
        this.submitQuiz();
        this.quizForceSubmitted.emit();
      } else if (trigger > handledTrigger) {
        handledTrigger = trigger;
      }
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
    if (this._nudgeTimeout) clearTimeout(this._nudgeTimeout);
    this.stopTimer();
    this._stopReadingTimer();
  }

  // ── Video end detection (YouTube / Vimeo via postMessage) ──────────────────
  @HostListener('window:message', ['$event'])
  onWindowMessage(event: MessageEvent): void {
    if (this.isComplete() || this.isLocked()) return;
    const block = this.block();
    if (!block || block.type !== EContentType.VIDEO || !VIDEO_PLAYER_ORIGINS.has(event.origin)) return;
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
  /** The server draws, orders and times the attempt; reloading resumes the same one. */
  protected startQuiz(): void {
    const block = this.block();
    const courseId = this.courseId();
    if (!this.canRetryQuiz() || !block || !courseId || this.quizStarting()) return;
    this.quizStarting.set(true);
    this.quizStartError.set(null);
    this.quizSessions.start(courseId, block.id).subscribe({
      next: session => {
        this.quizStarting.set(false);
        this._sessionId.set(session.sessionId);
        this._sessionLimit.set(session.remainingSeconds);
        this._attemptQuestions.set(session.questions.filter(q => q.type !== 'open'));
        this._submittedAnswers.set({});
        this.quizAnswers.set({});
        this.quizPhase.set('taking');
        this.currentQIdx.set(0);
        this.startTimer();
      },
      error: (err: Error) => {
        this.quizStarting.set(false);
        this.quizStartError.set(err.message);
      },
    });
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

  protected trySubmitQuiz(): void {
    this.showSubmitConfirm.set(true);
  }

  protected cancelSubmitConfirm(): void {
    this.showSubmitConfirm.set(false);
  }

  protected confirmAndSubmit(): void {
    this.showSubmitConfirm.set(false);
    this.submitQuiz();
  }

  protected submitQuiz(): void {
    const block = this.block();
    const cid   = this.courseId();
    const lid   = this.lessonId();
    if (!block || !cid || !lid) return;
    this.stopTimer();
    this._submittedAnswers.set({ ...this.quizAnswers() });
    const answers: IQuizAnswer[] = this.quizQuestions().map(q => ({
      questionId: q.id,
      answer: this.quizAnswers()[q.id] ?? ''
    }));
    this.quizSubmit.emit({ blockId: block.id, lessonId: lid, courseId: cid, answers, sessionId: this._sessionId() ?? undefined });
    this._sessionId.set(null);
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
    this._sessionId.set(null);
    this._sessionLimit.set(null);
    this.quizStartError.set(null);
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

  protected editAssignment(): void {
    const sub = this.assignmentSubmission();
    if (sub?.textContent) this.assignmentText.set(sub.textContent);
    this.assignmentEditing.set(true);
    this.assignmentSubmitted.set(false);
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
    this.assignmentEditing.set(false);
  }

  protected findAttemptQuestion(questionId: string): IQuestion | null {
    return this._attemptQuestions().find(q => q.id === questionId) ?? null;
  }

  protected getAnswerText(q: IQuestion, answer: string | string[] | boolean | undefined): string {
    if (answer === undefined || answer === null || answer === '') return 'Sin responder';
    if (q.type === 'true-false') return answer === true ? 'Verdadero' : 'Falso';
    if (q.type === 'multiple-choice') {
      const opts = (q as IMultipleChoiceQuestion).options;
      const ids = Array.isArray(answer) ? answer : [answer as string];
      return ids.map(id => opts.find(o => o.id === id)?.text ?? id).join(', ');
    }
    return String(answer);
  }

  protected submittedAnswers(): Record<string, string | string[] | boolean> {
    return this._submittedAnswers();
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
        // Solo se marca completo: saltar de página mientras alguien lee parecía un error.
        this.readingDone.emit();
      }
    }, 1000);
  }

  private _stopReadingTimer(): void {
    if (this._readingTimer) { clearInterval(this._readingTimer); this._readingTimer = null; }
  }
}
