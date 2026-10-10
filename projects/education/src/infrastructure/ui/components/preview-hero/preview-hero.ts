import { Component, input, output, computed, signal, effect, inject, viewChild, DestroyRef, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { ICourse, EDifficulty } from '../../../../domain/model/course.model';
import { ILearningPath } from '../../../../domain/model/learning-path.model';
import { OPEN_INSTITUTION_ID, TPreviewType } from '../../../../domain/model/catalog.model';
import { DIFFICULTY_LABELS, formatDuration } from '../../utils/course-labels';

@Component({
  selector: 'edu-preview-hero',
  templateUrl: './preview-hero.html',
  styleUrl: './preview-hero.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewHero {
  protected readonly _r = 1;
  readonly type       = input.required<TPreviewType>();
  readonly course     = input<ICourse | null>(null);
  readonly path       = input<ILearningPath | null>(null);
  readonly isEnrolled = input<boolean>(false);
  /** Why the student cannot enroll now; null when they can. */
  readonly blockedReason = input<string | null>(null);
  /** Enrollment period, closing date and seats, shown under the button. */
  readonly enrollmentInfo = input<string | null>(null);

  readonly enroll = output<void>();
  readonly play   = output<void>();
  readonly back   = output<void>();

  protected readonly title       = computed(() => this.type() === 'course' ? this.course()?.title : this.path()?.title);
  protected readonly description = computed(() => this.type() === 'course' ? this.course()?.description : this.path()?.description);
  protected readonly thumbnail   = computed(() => this.type() === 'course' ? this.course()?.thumbnailUrl : this.path()?.thumbnailUrl);
  protected readonly tags        = computed(() => this.type() === 'course' ? (this.course()?.tags ?? []) : (this.path()?.tags ?? []));
  /** Curso gratis de GEMS Abierto: mismo lenguaje que la portada pública («Empezar gratis»). */
  protected readonly isFree      = computed(() => this.type() === 'course' && this.course()?.institutionId === OPEN_INSTITUTION_ID);
  protected readonly ctaLabel    = computed(() => this.isEnrolled()
    ? `Continuar ${this.type() === 'path' ? 'ruta' : 'curso'}`
    : this.isFree() ? 'Empezar gratis' : `Inscribirme ${this.type() === 'path' ? 'a la ruta' : 'al curso'}`);

  private readonly heroCta = viewChild<ElementRef<HTMLElement>>('heroCta');
  protected readonly ctaInView = signal(false);
  protected readonly showMobileCta = computed(() => !!this.title() && !this.ctaInView() && (this.isEnrolled() || !this.blockedReason()));

  constructor() {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => this.ctaInView.set(entry.isIntersecting));
    inject(DestroyRef).onDestroy(() => observer.disconnect());
    effect(() => {
      const el = this.heroCta()?.nativeElement;
      observer.disconnect();
      if (el) observer.observe(el);
      else this.ctaInView.set(false);
    });
  }

  protected difficultyLabel(d: EDifficulty): string { return DIFFICULTY_LABELS[d] ?? d; }
  protected formatDuration(m: number): string { return formatDuration(m); }
}
