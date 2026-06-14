import {
  Component, inject, input, output, signal, computed, OnChanges, SimpleChanges, ChangeDetectionStrategy
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl, SafeHtml } from '@angular/platform-browser';
import {
  IContentBlock, EContentType, IQuestion, IMultipleChoiceQuestion, ITrueFalseQuestion, IOpenQuestion
} from '../../../../domain/model/course.model';
import { IQuizAnswer } from '../../../../domain/model/enrollment.model';
import {
  IQuizSubmitPayload, IAssignmentSubmitPayload, IQuizResult
} from '../../../../domain/model/player.model';

@Component({
  selector: 'edu-player-content-block',
  standalone: true,
  imports: [DecimalPipe, FormsModule],
  templateUrl: './player-content-block.html',
  styleUrl: './player-content-block.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerContentBlock implements OnChanges {
  private readonly sanitizer = inject(DomSanitizer);

  readonly block         = input.required<IContentBlock | null>();
  readonly courseId      = input<string | null>(null);
  readonly lessonId      = input<string | null>(null);
  readonly isSubmitting  = input<boolean>(false);
  readonly lastQuizResult = input<IQuizResult | null>(null);
  readonly isComplete    = input<boolean>(false);

  readonly quizSubmit        = output<IQuizSubmitPayload>();
  readonly assignmentSubmit  = output<IAssignmentSubmitPayload>();
  readonly markComplete      = output<void>();

  protected readonly EContentType = EContentType;

  protected readonly quizAnswers    = signal<Record<string, string | string[] | boolean>>({});
  protected readonly quizSubmitted  = signal(false);
  protected readonly assignmentText = signal('');
  protected readonly assignmentSubmitted = signal(false);

  protected readonly videoEmbedUrl = computed((): SafeResourceUrl | null => {
    const block = this.block();
    if (!block || block.type !== EContentType.VIDEO || !block.url) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.resolveVideoUrl(block));
  });

  protected readonly renderedMarkdown = computed((): SafeHtml | null => {
    const block = this.block();
    if (!block || block.type !== EContentType.DOCUMENT || !block.markdownContent) return null;
    return this.sanitizer.bypassSecurityTrustHtml(this.parseMarkdown(block.markdownContent));
  });

  protected readonly quizQuestions = computed(() => (this.block()?.questions ?? []) as IQuestion[]);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['block']) {
      this.quizAnswers.set({});
      this.quizSubmitted.set(false);
      this.assignmentText.set('');
      this.assignmentSubmitted.set(false);
    }
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

  protected submitQuiz(): void {
    const block = this.block();
    const cid   = this.courseId();
    const lid   = this.lessonId();
    if (!block || !cid || !lid) return;
    const answers: IQuizAnswer[] = this.quizQuestions().map(q => ({
      questionId: q.id,
      answer: this.quizAnswers()[q.id] ?? ''
    }));
    this.quizSubmit.emit({ blockId: block.id, lessonId: lid, courseId: cid, answers });
    this.quizSubmitted.set(true);
  }

  protected retryQuiz(): void {
    this.quizAnswers.set({});
    this.quizSubmitted.set(false);
  }

  protected submitAssignment(): void {
    const block = this.block();
    const cid   = this.courseId();
    const lid   = this.lessonId();
    if (!block || !this.assignmentText().trim() || !cid || !lid) return;
    this.assignmentSubmit.emit({
      blockId: block.id, lessonId: lid, courseId: cid, textContent: this.assignmentText()
    });
    this.assignmentSubmitted.set(true);
  }

  protected asMCQ(q: IQuestion):  IMultipleChoiceQuestion { return q as IMultipleChoiceQuestion; }
  protected asTF(q: IQuestion):   ITrueFalseQuestion       { return q as ITrueFalseQuestion; }
  protected asOpen(q: IQuestion): IOpenQuestion            { return q as IOpenQuestion; }

  private resolveVideoUrl(block: IContentBlock): string {
    const url = block.url!;
    if (url.includes('/embed/') || url.includes('player.vimeo')) return url;
    if (url.includes('youtube') || url.includes('youtu.be') || block.videoProvider === 'youtube') {
      const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^?&]+)/);
      const id = match?.[1] ?? '';
      return id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1` : url;
    }
    if (url.includes('vimeo') || block.videoProvider === 'vimeo') {
      const match = url.match(/vimeo\.com\/(\d+)/);
      const id = match?.[1] ?? '';
      return id ? `https://player.vimeo.com/video/${id}?title=0&byline=0` : url;
    }
    return url;
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
