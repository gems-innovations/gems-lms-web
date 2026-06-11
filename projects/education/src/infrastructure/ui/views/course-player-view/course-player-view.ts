import {
  Component, inject, input, output, signal, computed, effect, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl, SafeHtml } from '@angular/platform-browser';
import {
  ICourse, ILesson, ICourseModule, IContentBlock, EContentType,
  IMultipleChoiceQuestion, ITrueFalseQuestion, IOpenQuestion, IQuestion
} from '../../../../domain/model/course.model';
import { IEnrollment, IQuizAnswer } from '../../../../domain/model/enrollment.model';

export interface IQuizSubmitPayload {
  blockId: string;
  lessonId: string;
  courseId: string;
  answers: IQuizAnswer[];
}

export interface IAssignmentSubmitPayload {
  blockId: string;
  lessonId: string;
  courseId: string;
  textContent: string;
}

export interface IQuizResultFeedback {
  questionId: string;
  correct: boolean;
  explanation?: string;
}

export interface IQuizResult {
  score: number;
  passed: boolean;
  feedback?: IQuizResultFeedback[];
}

@Component({
  selector: 'edu-course-player-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './course-player-view.html',
  styleUrl: './course-player-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CoursePlayerView {
  private readonly sanitizer = inject(DomSanitizer);

  // ── Inputs ───────────────────────────────────────────────────────────────────
  readonly course           = input<ICourse | null>(null);
  readonly enrollment       = input<IEnrollment | null>(null);
  readonly courseId         = input<string | null>(null);
  readonly initialLessonId  = input<string | null>(null);
  readonly initialBlockId   = input<string | null>(null);
  readonly isSubmitting     = input<boolean>(false);
  readonly lastQuizResult   = input<IQuizResult | null>(null);

  // ── Outputs ──────────────────────────────────────────────────────────────────
  readonly onGoHome            = output<void>();
  readonly onLessonSelected    = output<string>(); // for progress tracking
  readonly onQuizSubmit        = output<IQuizSubmitPayload>();
  readonly onAssignmentSubmit  = output<IAssignmentSubmitPayload>();

  // ── View-local state ─────────────────────────────────────────────────────────
  readonly selectedLessonId   = signal<string | null>(null);
  readonly selectedBlockIdx   = signal(0);
  readonly sidebarCollapsed   = signal(false);
  readonly sidebarWidth       = signal(500);
  readonly isResizingSidebar  = signal(false);
  readonly completedBlockIds  = signal<Set<string>>(new Set());
  readonly quizAnswers        = signal<Record<string, string | string[] | boolean>>({});
  readonly quizSubmitted      = signal(false);
  readonly assignmentText     = signal('');
  readonly assignmentSubmitted = signal(false);

  // ── Derived ───────────────────────────────────────────────────────────────────
  readonly EContentType = EContentType;

  readonly allLessons = computed((): { lesson: ILesson; module: ICourseModule }[] => {
    const c = this.course();
    if (!c) return [];
    return c.modules.flatMap(mod => mod.lessons.map(lesson => ({ lesson, module: mod })));
  });

  readonly selectedLesson = computed((): ILesson | null => {
    const c = this.course();
    const lessonId = this.selectedLessonId();
    if (!c || !lessonId) return null;
    for (const mod of c.modules) {
      const l = mod.lessons.find(l => l.id === lessonId);
      if (l) return l;
    }
    return null;
  });

  readonly selectedBlock = computed((): IContentBlock | null => {
    const l = this.selectedLesson();
    if (!l || !l.contentBlocks.length) return null;
    return l.contentBlocks[this.selectedBlockIdx()] ?? null;
  });

  readonly videoEmbedUrl = computed((): SafeResourceUrl | null => {
    const block = this.selectedBlock();
    if (!block || block.type !== EContentType.VIDEO || !block.url) return null;
    const url = block.url;
    if (url.includes('/embed/') || url.includes('player.vimeo')) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
    if (url.includes('youtube') || url.includes('youtu.be') || block.videoProvider === 'youtube') {
      const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^?&]+)/);
      const id = match ? match[1] : '';
      if (!id) return this.sanitizer.bypassSecurityTrustResourceUrl(url);
      return this.sanitizer.bypassSecurityTrustResourceUrl(
        `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`
      );
    }
    if (url.includes('vimeo') || block.videoProvider === 'vimeo') {
      const match = url.match(/vimeo\.com\/(\d+)/);
      const id = match ? match[1] : '';
      if (!id) return this.sanitizer.bypassSecurityTrustResourceUrl(url);
      return this.sanitizer.bypassSecurityTrustResourceUrl(
        `https://player.vimeo.com/video/${id}?title=0&byline=0`
      );
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  readonly renderedMarkdown = computed((): SafeHtml | null => {
    const block = this.selectedBlock();
    if (!block || block.type !== EContentType.DOCUMENT || !block.markdownContent) return null;
    return this.sanitizer.bypassSecurityTrustHtml(this.parseMarkdown(block.markdownContent));
  });

  readonly hasNextBlock = computed((): boolean => {
    const l = this.selectedLesson();
    return !!l && this.selectedBlockIdx() < l.contentBlocks.length - 1;
  });

  readonly hasPrevBlock  = computed((): boolean => this.selectedBlockIdx() > 0);

  readonly hasNextLesson = computed((): boolean => {
    const all = this.allLessons();
    const idx = all.findIndex(x => x.lesson.id === this.selectedLessonId());
    return idx < all.length - 1;
  });

  readonly courseProgress = computed((): number => {
    const c = this.course();
    if (!c) return 0;
    const totalBlocks = c.modules.flatMap(m => m.lessons).flatMap(l => l.contentBlocks).length;
    if (!totalBlocks) return 0;
    return Math.round((this.completedBlockIds().size / totalBlocks) * 100);
  });

  readonly quizQuestions = computed(() => (this.selectedBlock()?.questions ?? []) as IQuestion[]);

  // ── Constructor: auto-select initial lesson via effect ────────────────────────
  constructor() {
    effect(() => {
      if (this.selectedLessonId() || !this.course()) return;
      const c = this.course()!;
      if (!c.modules.length) return;

      const lessonId: string | undefined =
        this.initialLessonId() ??
        this.enrollment()?.progress.currentLessonId ??
        c.modules[0]?.lessons[0]?.id;

      if (!lessonId) return;
      this.selectedLessonId.set(lessonId);

      const lesson = c.modules.flatMap(m => m.lessons).find(l => l.id === lessonId);
      if (lesson && this.initialBlockId()) {
        const blockIdx = lesson.contentBlocks.findIndex(b => b.id === this.initialBlockId());
        if (blockIdx > -1) this.selectedBlockIdx.set(blockIdx);
      }
    });
  }

  // ── Lesson / block navigation ─────────────────────────────────────────────────
  selectLesson(lessonId: string): void {
    if (this.selectedLessonId() === lessonId) return;
    this.selectedLessonId.set(lessonId);
    this.selectedBlockIdx.set(0);
    this.resetContentState();
    this.onLessonSelected.emit(lessonId);
  }

  selectBlock(idx: number): void {
    this.selectedBlockIdx.set(idx);
    this.resetContentState();
  }

  nextBlock(): void {
    if (this.hasNextBlock()) {
      this.selectedBlockIdx.update(i => i + 1);
      this.resetContentState();
    } else if (this.hasNextLesson()) {
      const all = this.allLessons();
      const nextIdx = all.findIndex(x => x.lesson.id === this.selectedLessonId()) + 1;
      if (nextIdx < all.length) this.selectLesson(all[nextIdx].lesson.id);
    }
  }

  prevBlock(): void {
    if (this.hasPrevBlock()) {
      this.selectedBlockIdx.update(i => i - 1);
      this.resetContentState();
    }
  }

  markBlockComplete(): void {
    const block = this.selectedBlock();
    if (!block) return;
    this.completedBlockIds.update(set => new Set([...set, block.id]));
    if (this.hasNextBlock() || this.hasNextLesson()) this.nextBlock();
  }

  isBlockComplete(blockId: string): boolean { return this.completedBlockIds().has(blockId); }

  isLessonComplete(lesson: ILesson): boolean {
    return lesson.contentBlocks.length > 0 &&
      lesson.contentBlocks.every(b => this.completedBlockIds().has(b.id));
  }

  toggleSidebar(): void { this.sidebarCollapsed.update(v => !v); }

  // ── Sidebar resize por arrastre ───────────────────────────────────────────────
  startSidebarResize(event: MouseEvent): void {
    event.preventDefault();
    this.isResizingSidebar.set(true);
    const startX = event.clientX;
    const startWidth = this.sidebarWidth();

    const onMove = (e: MouseEvent) => {
      // El sidebar está a la derecha: arrastrar a la izquierda lo agranda
      const delta = startX - e.clientX;
      const width = Math.min(720, Math.max(320, startWidth + delta));
      this.sidebarWidth.set(width);
    };

    const onUp = () => {
      this.isResizingSidebar.set(false);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // ── Quiz ──────────────────────────────────────────────────────────────────────
  setAnswer(questionId: string, value: string | string[] | boolean): void {
    this.quizAnswers.update(a => ({ ...a, [questionId]: value }));
  }

  toggleMultiAnswer(questionId: string, optionId: string): void {
    const current = (this.quizAnswers()[questionId] as string[]) ?? [];
    const updated = current.includes(optionId)
      ? current.filter(id => id !== optionId)
      : [...current, optionId];
    this.setAnswer(questionId, updated);
  }

  getAnswer(questionId: string): string | string[] | boolean | undefined {
    return this.quizAnswers()[questionId];
  }

  isOptionChecked(questionId: string, optionId: string): boolean {
    const a = this.getAnswer(questionId);
    return Array.isArray(a) ? a.includes(optionId) : a === optionId;
  }

  submitQuiz(): void {
    const block = this.selectedBlock();
    const cid = this.courseId();
    const lid = this.selectedLessonId();
    if (!block || !cid || !lid) return;

    const answers: IQuizAnswer[] = this.quizQuestions().map(q => ({
      questionId: q.id,
      answer: this.quizAnswers()[q.id] ?? ''
    }));

    this.onQuizSubmit.emit({ blockId: block.id, lessonId: lid, courseId: cid, answers });
    this.quizSubmitted.set(true);
    this.completedBlockIds.update(s => new Set([...s, block.id]));
  }

  retryQuiz(): void {
    this.quizAnswers.set({});
    this.quizSubmitted.set(false);
  }

  // ── Assignment ────────────────────────────────────────────────────────────────
  submitAssignment(): void {
    const block = this.selectedBlock();
    const cid = this.courseId();
    const lid = this.selectedLessonId();
    if (!block || !this.assignmentText().trim() || !cid || !lid) return;

    this.onAssignmentSubmit.emit({
      blockId: block.id, lessonId: lid, courseId: cid, textContent: this.assignmentText()
    });
    this.assignmentSubmitted.set(true);
    this.completedBlockIds.update(s => new Set([...s, block.id]));
  }

  // ── Display helpers ───────────────────────────────────────────────────────────
  getModuleForLesson(lessonId: string): ICourseModule | null {
    const c = this.course();
    if (!c) return null;
    return c.modules.find(m => m.lessons.some(l => l.id === lessonId)) ?? null;
  }

  asMCQ(q: IQuestion): IMultipleChoiceQuestion { return q as IMultipleChoiceQuestion; }
  asTF(q: IQuestion):  ITrueFalseQuestion  { return q as ITrueFalseQuestion;  }
  asOpen(q: IQuestion): IOpenQuestion      { return q as IOpenQuestion;        }

  getFlatLessonNumber(moduleIdx: number, lessonIdx: number): number {
    const c = this.course();
    if (!c) return lessonIdx + 1;
    let count = 0;
    for (let i = 0; i < moduleIdx; i++) count += c.modules[i].lessons.length;
    return count + lessonIdx + 1;
  }

  getLessonContentType(lesson: ILesson): string {
    return lesson.contentBlocks[0]?.type ?? 'video';
  }

  formatDuration(minutes: number): string {
    if (!minutes) return '—';
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  trackById(_: number, item: { id: string }): string { return item.id; }

  private resetContentState(): void {
    this.quizAnswers.set({});
    this.quizSubmitted.set(false);
    this.assignmentText.set('');
    this.assignmentSubmitted.set(false);
  }

  private parseMarkdown(md: string): string {
    return md
      .replace(/```[\w]*\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
      .replace(/^---$/gm, '<hr>')
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
      .replace(/^[*-] (.+)$/gm, '<li>$1</li>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
  }
}
