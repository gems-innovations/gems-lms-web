import { Injectable, inject, signal, computed } from '@angular/core';
import { AuthSessionService } from 'auth';
import { SurveyService } from '../infrastructure/services/survey.service';
import type { ICourseSurvey, ISurveyAnswer, ISurveyResponse } from '../domain/model/survey.model';

@Injectable()
export class CourseSurveyUseCase {
  private readonly surveyService = inject(SurveyService);
  private readonly authSession   = inject(AuthSessionService);

  private readonly _survey       = signal<ICourseSurvey | null>(null);
  private readonly _isLoading    = signal(true);
  private readonly _sectionIndex = signal(0);
  private readonly _visited      = signal<Set<number>>(new Set([0]));
  private readonly _answers      = signal<Record<string, number | string>>({});
  private readonly _submitted    = signal(false);
  private readonly _isSubmitting = signal(false);
  private courseId = '';

  readonly survey       = this._survey.asReadonly();
  readonly isLoading    = this._isLoading.asReadonly();
  readonly sectionIndex = this._sectionIndex.asReadonly();
  readonly visited       = this._visited.asReadonly();
  readonly answers      = this._answers.asReadonly();
  readonly submitted    = this._submitted.asReadonly();
  readonly isSubmitting = this._isSubmitting.asReadonly();

  readonly sections       = computed(() => this._survey()?.sections ?? []);
  readonly totalSections  = computed(() => this.sections().length);
  readonly currentSection = computed(() => this.sections()[this._sectionIndex()] ?? null);
  readonly isFirst        = computed(() => this._sectionIndex() === 0);
  readonly isLast         = computed(() => this._sectionIndex() >= this.totalSections() - 1);
  readonly progressPct    = computed(() =>
    this.totalSections() ? Math.round(((this._sectionIndex() + 1) / this.totalSections()) * 100) : 0
  );

  /** Ids de las secciones cuyas preguntas de escala ya están todas respondidas. */
  readonly completedSections = computed(() => {
    const answers = this._answers();
    const done = new Set<number>();
    this.sections().forEach((sec, i) => {
      const scaleQs = sec.questions.filter(q => q.type === 'scale');
      if (scaleQs.every(q => answers[q.id] != null)) done.add(i);
    });
    return done;
  });

  /** La sección actual tiene todas sus preguntas de escala respondidas (el texto libre es opcional). */
  readonly currentSectionAnswered = computed(() => {
    const section = this.currentSection();
    if (!section) return false;
    const answers = this._answers();
    return section.questions
      .filter(q => q.type === 'scale')
      .every(q => answers[q.id] != null);
  });

  init(courseId: string): void {
    this.courseId = courseId;
    this._isLoading.set(true);
    this._sectionIndex.set(0);
    this._visited.set(new Set([0]));
    this._answers.set({});
    this._submitted.set(false);
    this.surveyService.getSurvey(courseId).subscribe(survey => {
      this._survey.set(survey && survey.isPublished ? survey : null);
      this._isLoading.set(false);
    });
  }

  setAnswer(questionId: string, value: number | string): void {
    this._answers.update(a => ({ ...a, [questionId]: value }));
  }

  next(): void {
    if (this.isLast() || !this.currentSectionAnswered()) return;
    this.goToSection(this._sectionIndex() + 1);
  }

  prev(): void { if (!this.isFirst()) this.goToSection(this._sectionIndex() - 1); }

  /** Salta a cualquier sección ya visitada, o a la siguiente inmediata si la actual está completa. */
  goToSection(index: number): void {
    if (index < 0 || index >= this.totalSections()) return;
    const isForward = index > this._sectionIndex();
    if (isForward && !this.currentSectionAnswered()) return;
    const canJump = this._visited().has(index) || index === this._sectionIndex() + 1;
    if (!canJump) return;
    this._sectionIndex.set(index);
    this._visited.update(v => new Set(v).add(index));
  }

  submit(): void {
    const survey = this._survey();
    if (!survey || this._isSubmitting() || !this.currentSectionAnswered()) return;
    this._isSubmitting.set(true);

    const user = this.authSession.user();
    const answers: ISurveyAnswer[] = Object.entries(this._answers())
      .map(([questionId, value]) => ({ questionId, value }));

    const response: ISurveyResponse = {
      id: `resp-${Date.now()}`,
      surveyId: survey.id,
      courseId: this.courseId,
      studentId: user?.id ?? 'anon',
      studentName: user ? `${user.firstName} ${user.lastName}` : 'Estudiante',
      answers,
      submittedAt: new Date(),
    };

    this.surveyService.submitResponse(response).subscribe(() => {
      this._isSubmitting.set(false);
      this._submitted.set(true);
    });
  }
}
