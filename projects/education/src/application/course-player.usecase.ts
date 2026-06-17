import { inject, Injectable, signal, computed, effect, DestroyRef } from '@angular/core';
import { CourseUseCase } from './course.usecase';
import { EnrollmentUseCase } from './enrollment.usecase';
import { ILesson } from '../domain/model/course.model';

@Injectable({ providedIn: 'root' })
export class CoursePlayerUseCase {
  private readonly courseUc     = inject(CourseUseCase);
  private readonly enrollmentUc = inject(EnrollmentUseCase);

  //#region State
  private readonly _courseId         = signal<string | null>(null);
  private readonly _selectedLessonId = signal<string | null>(null);
  private readonly _selectedBlockIdx = signal(0);
  private readonly _completedBlockIds = signal<Set<string>>(new Set());

  private _initialLessonId: string | null = null;
  private _initialBlockId:  string | null = null;
  //#endregion

  //#region Computed
  readonly courseId         = computed(() => this._courseId());
  readonly selectedLessonId = computed(() => this._selectedLessonId());
  readonly selectedBlockIdx = computed(() => this._selectedBlockIdx());
  readonly completedBlockIds = computed(() => this._completedBlockIds());

  readonly isLoading    = computed(() => this.courseUc.isLoading() || this.enrollmentUc.isLoading());
  readonly isSubmitting = computed(() => this.enrollmentUc.isSubmitting());
  readonly lastQuizResult = computed(() => this.enrollmentUc.lastQuizResult());

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

  readonly courseProgress = computed(() => {
    const c = this.course();
    if (!c) return 0;
    const totalBlocks = c.modules.flatMap(m => m.lessons).flatMap(l => l.contentBlocks).length;
    if (!totalBlocks) return 0;
    return Math.round((this._completedBlockIds().size / totalBlocks) * 100);
  });

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
  //#endregion

  constructor() {
    effect(() => {
      const enrollment = this.enrollment();
      if (!enrollment) return;
      const ids = enrollment.progress.completedBlockIds;
      if (ids?.length) {
        this._completedBlockIds.set(new Set(ids));
      }
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

  handleQuizSubmit(payload: { blockId: string; lessonId: string; courseId: string; answers: any[] }): void {
    this.enrollmentUc.submitQuiz(payload);
    this._completedBlockIds.update(s => new Set([...s, payload.blockId]));
  }

  handleAssignmentSubmit(payload: { blockId: string; lessonId: string; courseId: string; textContent: string }): void {
    this.enrollmentUc.submitAssignment(payload);
    this._completedBlockIds.update(s => new Set([...s, payload.blockId]));
  }
  //#endregion
}
