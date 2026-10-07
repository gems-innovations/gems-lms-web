import { inject, Injectable, signal, computed, effect, DestroyRef } from '@angular/core';
import { CourseUseCase } from './course.usecase';
import { EnrollmentUseCase } from './enrollment.usecase';
import { EContentType, ILesson } from '../domain/model/course.model';
import { ICourseCertificate } from '../domain/model/player.model';
import { AuthSessionService } from 'auth';
import { SurveyService } from '../infrastructure/services/survey.service';

/** Institución de los cursos gratis y abiertos (sin certificado: muestran el resultado final). */
export const OPEN_INSTITUTION_ID = 'gems-abierto';

@Injectable({ providedIn: 'root' })
export class CoursePlayerUseCase {
  private readonly courseUc     = inject(CourseUseCase);
  private readonly enrollmentUc = inject(EnrollmentUseCase);
  private readonly authSession  = inject(AuthSessionService);
  private readonly surveyService = inject(SurveyService);

  //#region State
  private readonly _courseId         = signal<string | null>(null);
  private readonly _selectedLessonId = signal<string | null>(null);
  private readonly _selectedBlockIdx = signal(0);
  private readonly _completedBlockIds = signal<Set<string>>(new Set());
  private readonly _hasSurvey        = signal(false);

  private _initialLessonId: string | null = null;
  private _initialBlockId:  string | null = null;
  //#endregion

  //#region Computed
  readonly courseId         = computed(() => this._courseId());
  readonly hasSurvey        = computed(() => this._hasSurvey());
  readonly selectedLessonId = computed(() => this._selectedLessonId());
  readonly selectedBlockIdx = computed(() => this._selectedBlockIdx());
  readonly completedBlockIds = computed(() => this._completedBlockIds());

  readonly isLoading    = computed(() => this.courseUc.isLoading() || this.enrollmentUc.isLoading());
  readonly isSubmitting = computed(() => this.enrollmentUc.isSubmitting());
  readonly lastQuizResult = computed(() => {
    const block = this.selectedBlock();
    if (!block) return null;
    const attempts = this.enrollmentUc.quizAttempts().filter(a => a.blockId === block.id);
    if (!attempts.length) return null;
    // Always show the best score, not the latest attempt
    return attempts.reduce((best, current) => current.score > best.score ? current : best);
  });

  readonly course = computed(() => {
    const id = this._courseId();
    return id ? this.courseUc.courses().find(c => c.id === id) ?? null : null;
  });

  readonly enrollment = computed(() => {
    const id = this._courseId();
    return id ? this.enrollmentUc.getEnrollmentByCourse(id) : null;
  });

  readonly allLessons = computed(() => {
    const c = this.course();
    if (!c) return [] as { lesson: ILesson; moduleIdx: number }[];
    return c.modules.flatMap((mod, moduleIdx) =>
      mod.lessons.map(lesson => ({ lesson, moduleIdx }))
    );
  });

  readonly selectedLesson = computed(() => {
    const c = this.course();
    const id = this._selectedLessonId();
    if (!c || !id) return null;
    for (const mod of c.modules) {
      const l = mod.lessons.find(l => l.id === id);
      if (l) return l;
    }
    return null;
  });

  readonly selectedBlock = computed(() => {
    const l = this.selectedLesson();
    if (!l || !l.contentBlocks.length) return null;
    return l.contentBlocks[this._selectedBlockIdx()] ?? null;
  });

  readonly hasNextBlock = computed(() => {
    const l = this.selectedLesson();
    return !!l && this._selectedBlockIdx() < l.contentBlocks.length - 1;
  });

  readonly hasPrevBlock = computed(() => this._selectedBlockIdx() > 0);

  readonly hasNextLesson = computed(() => {
    const all = this.allLessons();
    const idx = all.findIndex(x => x.lesson.id === this._selectedLessonId());
    return idx >= 0 && idx < all.length - 1;
  });

  // El estudiante está en el último bloque del curso (no hay siguiente).
  readonly isCourseEnd = computed(() => !this.hasNextBlock() && !this.hasNextLesson());

  readonly courseProgress = computed(() => {
    const c = this.course();
    if (!c) return 0;
    const totalBlocks = c.modules.flatMap(m => m.lessons).flatMap(l => l.contentBlocks).length;
    if (!totalBlocks) return 0;
    return Math.round((this._completedBlockIds().size / totalBlocks) * 100);
  });

  // La encuesta solo se habilita cuando el estudiante culmina el curso (100% de avance).
  /** Feedback (review, and the survey if the course has one) opens when the course is completed. */
  readonly surveyEnabled = computed(() => this.courseProgress() === 100);

  readonly isBlockComplete = computed(() => {
    const b = this.selectedBlock();
    return !!b && this._completedBlockIds().has(b.id);
  });

  /** Ordered flat list: all blocks across all lessons in curriculum order */
  readonly allFlatBlocks = computed((): { blockId: string; lessonId: string }[] => {
    const c = this.course();
    if (!c) return [];
    return c.modules.flatMap(mod =>
      mod.lessons.flatMap(lesson =>
        lesson.contentBlocks.map(block => ({ blockId: block.id, lessonId: lesson.id }))
      )
    );
  });

  /** Blocks that cannot be accessed yet (previous block not completed) */
  readonly lockedBlockIds = computed((): Set<string> => {
    const flat = this.allFlatBlocks();
    const done = this._completedBlockIds();
    const locked = new Set<string>();
    for (let i = 1; i < flat.length; i++) {
      const prev = flat[i - 1];
      if (!done.has(prev.blockId) || locked.has(prev.blockId)) {
        locked.add(flat[i].blockId);
      }
    }
    return locked;
  });

  /** Lessons whose first block is locked (entire lesson inaccessible) */
  readonly lockedLessonIds = computed((): Set<string> => {
    const locked = this.lockedBlockIds();
    const c = this.course();
    if (!c) return new Set();
    const result = new Set<string>();
    for (const mod of c.modules) {
      for (const lesson of mod.lessons) {
        if (lesson.contentBlocks.length > 0 && locked.has(lesson.contentBlocks[0].id)) {
          result.add(lesson.id);
        }
      }
    }
    return result;
  });

  readonly isCurrentBlockLocked = computed(() => {
    const b = this.selectedBlock();
    return !!b && this.lockedBlockIds().has(b.id);
  });

  /** Submissions for the current course that have been graded by the instructor */
  readonly gradedSubmissions = computed(() => {
    const courseId = this._courseId();
    if (!courseId) return [];
    return this.enrollmentUc.submissions().filter(s => s.courseId === courseId && s.status === 'graded');
  });

  readonly quizAttemptCount = computed(() => {
    const block = this.selectedBlock();
    if (!block) return 0;
    return this.enrollmentUc.quizAttempts().filter(a => a.blockId === block.id).length;
  });

  /** Cursos gratis de «GEMS Abierto»: no emiten certificado, muestran el resultado final. */
  readonly isOpenCourse = computed(() => this.course()?.institutionId === OPEN_INSTITUTION_ID);

  /**
   * Resultado de un curso gratis terminado: el último quiz del curso es el simulacro (su mejor intento
   * define si aprobó) y las demás prácticas dan un promedio de referencia.
   */
  readonly openResult = computed(() => {
    const c = this.course();
    if (!c || !this.isOpenCourse() || this.courseProgress() < 100) return null;
    const quizzes = c.modules.flatMap(m => m.lessons).flatMap(l => l.contentBlocks)
      .filter(b => b.type === EContentType.QUIZ);
    if (!quizzes.length) return null;
    const attempts = this.enrollmentUc.quizAttempts().filter(a => a.courseId === c.id);
    const best = (blockId: string) => attempts.filter(a => a.blockId === blockId)
      .reduce<number | null>((max, a) => (max === null || a.score > max ? a.score : max), null);
    const finalQuiz = quizzes[quizzes.length - 1];
    const finalScore = best(finalQuiz.id) ?? 0;
    const passingScore = finalQuiz.passingScore ?? 60;
    const practices = quizzes.slice(0, -1).map(q => best(q.id)).filter((s): s is number => s !== null);
    return {
      finalTitle: finalQuiz.title,
      finalScore: Math.round(finalScore),
      passingScore,
      passed: finalScore >= passingScore,
      practiceAverage: practices.length ? Math.round(practices.reduce((a, b) => a + b, 0) / practices.length) : null,
      practicesDone: practices.length,
    };
  });

  readonly certificate = computed((): ICourseCertificate | null => {
    const c = this.course();
    if (!c || this.courseProgress() < 100) return null;
    const user = this.authSession.user();
    const studentName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Estudiante';
    return {
      courseId:        c.id,
      courseTitle:     c.title,
      studentName,
      completedAt:     new Date(),
      certificateId:   `CERT-${c.id.slice(0, 8).toUpperCase()}`,
      instructorName:  c.instructorName,
      institutionName: 'GEMS LMS',
    };
  });
  //#endregion

  constructor() {
    effect(() => {
      const enrollment = this.enrollment();
      if (!enrollment) return;
      const ids = enrollment.progress.completedBlockIds;
      if (ids?.length) {
        // Merge (not replace) so blocks completed this session (quiz pass, timer, grade)
        // aren't wiped when enrollment signal re-fires (e.g. after updateProgress())
        this._completedBlockIds.update(s => {
          const next = new Set(s);
          ids.forEach(id => next.add(id));
          return next;
        });
      }
    });

    // Mark quiz blocks complete only when the student has a passing attempt
    effect(() => {
      const courseId = this._courseId();
      if (!courseId) return;
      for (const attempt of this.enrollmentUc.quizAttempts()) {
        if (attempt.courseId === courseId && attempt.passed) {
          this._completedBlockIds.update(s => new Set([...s, attempt.blockId]));
        }
      }
    });

    // Mark assignment blocks complete when instructor grades them
    effect(() => {
      const courseId = this._courseId();
      if (!courseId) return;
      for (const sub of this.enrollmentUc.submissions()) {
        if (sub.courseId === courseId && sub.status === 'graded') {
          this._completedBlockIds.update(s => new Set([...s, sub.blockId]));
        }
      }
    });

    // Mark quiz blocks complete only when the best attempt is passing
    effect(() => {
      const courseId = this._courseId();
      if (!courseId) return;
      const attempts = this.enrollmentUc.quizAttempts().filter(a => a.courseId === courseId);
      if (!attempts.length) return;
      const byBlock = new Map<string, typeof attempts>();
      for (const a of attempts) {
        if (!byBlock.has(a.blockId)) byBlock.set(a.blockId, []);
        byBlock.get(a.blockId)!.push(a);
      }
      for (const [blockId, blockAttempts] of byBlock) {
        const best = blockAttempts.reduce((b, c) => c.score > b.score ? c : b);
        if (best.passed) {
          this._completedBlockIds.update(s => new Set([...s, blockId]));
        }
      }
    });

    // Persist newly completed blocks (and the course percentage) to the enrollment.
    effect(() => {
      const enrollment = this.enrollment();
      const done = this._completedBlockIds();
      if (!enrollment || !this.course()) return;
      const saved = new Set(enrollment.progress.completedBlockIds ?? []);
      if ([...done].every(id => saved.has(id))) return;
      this.enrollmentUc.saveCompletedBlocks(enrollment.id, [...new Set([...saved, ...done])], this.courseProgress());
    });

    effect(() => {
      if (this._selectedLessonId() || !this.course()) return;
      const c = this.course()!;
      if (!c.modules.length) return;
      const lessonId: string | undefined =
        this._initialLessonId ??
        this.enrollment()?.progress.currentLessonId ??
        c.modules[0]?.lessons[0]?.id;
      if (!lessonId) return;
      this._selectedLessonId.set(lessonId);
      if (this._initialBlockId) {
        const lesson = c.modules.flatMap(m => m.lessons).find(l => l.id === lessonId);
        const blockIdx = lesson?.contentBlocks.findIndex(b => b.id === this._initialBlockId) ?? -1;
        if (blockIdx > -1) this._selectedBlockIdx.set(blockIdx);
      }
    });
  }

  //#region Public API
  init(courseId: string, initialLessonId?: string | null, initialBlockId?: string | null): void {
    this._courseId.set(courseId);
    this._selectedLessonId.set(null);
    this._selectedBlockIdx.set(0);
    this._completedBlockIds.set(new Set());
    this._hasSurvey.set(false);
    this.surveyService.getSurvey(courseId).subscribe(s => this._hasSurvey.set(!!s && s.isPublished));
    this._initialLessonId = initialLessonId ?? null;
    this._initialBlockId  = initialBlockId  ?? null;
    // Seed immediately from cache if available
    const cached = this.enrollmentUc.getEnrollmentByCourse(courseId);
    if (cached?.progress.completedBlockIds?.length) {
      this._completedBlockIds.set(new Set(cached.progress.completedBlockIds));
    }
    this.courseUc.load();
    if (this.enrollmentUc.enrollments().length === 0) this.enrollmentUc.loadEnrollments();
  }

  selectLesson(lessonId: string): void {
    if (this.lockedLessonIds().has(lessonId)) return;
    if (this._selectedLessonId() === lessonId) return;
    this._selectedLessonId.set(lessonId);
    this._selectedBlockIdx.set(0);
    const enrollment = this.enrollment();
    if (enrollment) this.enrollmentUc.updateProgress(enrollment.id, lessonId, '');
  }

  selectBlock(blockId: string): void {
    if (this.lockedBlockIds().has(blockId)) return;
    const lesson = this.selectedLesson();
    if (!lesson) return;
    const idx = lesson.contentBlocks.findIndex(b => b.id === blockId);
    if (idx > -1) this._selectedBlockIdx.set(idx);
  }

  nextBlock(): void {
    const current = this.selectedBlock();
    if (current && !this._completedBlockIds().has(current.id)) return;
    if (this.hasNextBlock()) {
      this._selectedBlockIdx.update(i => i + 1);
    } else if (this.hasNextLesson()) {
      const all = this.allLessons();
      const nextIdx = all.findIndex(x => x.lesson.id === this._selectedLessonId()) + 1;
      if (nextIdx < all.length) this.selectLesson(all[nextIdx].lesson.id);
    }
  }

  prevBlock(): void {
    if (this.hasPrevBlock()) this._selectedBlockIdx.update(i => i - 1);
  }

  markComplete(): void {
    const block = this.selectedBlock();
    if (!block) return;
    this._completedBlockIds.update(s => new Set([...s, block.id]));
    if (this.hasNextBlock() || this.hasNextLesson()) this.nextBlock();
  }

  markBlockComplete(blockId: string): void {
    this._completedBlockIds.update(s => new Set([...s, blockId]));
  }

  handleQuizSubmit(payload: { blockId: string; lessonId: string; courseId: string; answers: any[]; sessionId?: string }): void {
    this.enrollmentUc.submitQuiz(payload);
    // Block completion is handled reactively by the quiz-attempts effect (only if passed)
  }

  handleAssignmentSubmit(payload: { blockId: string; lessonId: string; courseId: string; textContent: string; attachedFile?: File }): void {
    this.enrollmentUc.submitAssignment(payload);
    // Block is NOT marked complete here — only when the instructor grades it
  }
  //#endregion
}
