import {
  Component, inject, OnInit, signal, computed, effect, ChangeDetectionStrategy
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CourseUseCase } from '../../../../application/course.usecase';
import { EnrollmentUseCase } from '../../../../application/enrollment.usecase';
import { LoadingSkeletonComponent, EmptyStateComponent } from 'shared';
import { PlayerTopbar } from '../../components/player-topbar/player-topbar';
import { PlayerSidebar } from '../../components/player-sidebar/player-sidebar';
import { PlayerContentBlock, IQuizSubmitPayload, IAssignmentSubmitPayload } from '../../components/player-content-block/player-content-block';
import { ILesson } from '../../../../domain/model/course.model';

@Component({
  selector: 'edu-course-player-container',
  standalone: true,
  imports: [LoadingSkeletonComponent, EmptyStateComponent, PlayerTopbar, PlayerSidebar, PlayerContentBlock],
  templateUrl: './course-player-container.html',
  styleUrl: './course-player-container.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoursePlayerContainer implements OnInit {
  private readonly route        = inject(ActivatedRoute);
  private readonly router       = inject(Router);
  private readonly courseUc     = inject(CourseUseCase);
  private readonly enrollmentUc = inject(EnrollmentUseCase);

  // ── Route params ─────────────────────────────────────────────────────────────
  protected readonly courseId      = signal<string | null>(null);
  private readonly initialLessonId: string | null;
  private readonly initialBlockId:  string | null;

  // ── Nav state ────────────────────────────────────────────────────────────────
  protected readonly selectedLessonId  = signal<string | null>(null);
  protected readonly selectedBlockIdx  = signal(0);
  protected readonly sidebarCollapsed  = signal(false);
  protected readonly sidebarWidth      = signal(500);
  protected readonly completedBlockIds = signal<Set<string>>(new Set());

  // ── Derived from use cases ───────────────────────────────────────────────────
  protected readonly course = computed(() => {
    const id = this.courseId();
    return id ? this.courseUc.courses().find(c => c.id === id) ?? null : null;
  });

  protected readonly enrollment = computed(() => {
    const id = this.courseId();
    return id ? this.enrollmentUc.getEnrollmentByCourse(id) : null;
  });

  protected readonly isLoading    = computed(() => this.courseUc.isLoading() || this.enrollmentUc.isLoading());
  protected readonly isSubmitting = computed(() => this.enrollmentUc.isSubmitting());
  protected readonly lastQuizResult = computed(() => this.enrollmentUc.lastQuizResult());

  // ── Lesson/block navigation ──────────────────────────────────────────────────
  protected readonly allLessons = computed(() => {
    const c = this.course();
    if (!c) return [] as { lesson: ILesson; moduleIdx: number }[];
    return c.modules.flatMap((mod, moduleIdx) => mod.lessons.map(lesson => ({ lesson, moduleIdx })));
  });

  protected readonly selectedLesson = computed(() => {
    const c = this.course();
    const id = this.selectedLessonId();
    if (!c || !id) return null;
    for (const mod of c.modules) {
      const l = mod.lessons.find(l => l.id === id);
      if (l) return l;
    }
    return null;
  });

  protected readonly selectedBlock = computed(() => {
    const l = this.selectedLesson();
    if (!l || !l.contentBlocks.length) return null;
    return l.contentBlocks[this.selectedBlockIdx()] ?? null;
  });

  protected readonly hasNextBlock = computed(() => {
    const l = this.selectedLesson();
    return !!l && this.selectedBlockIdx() < l.contentBlocks.length - 1;
  });

  protected readonly hasPrevBlock = computed(() => this.selectedBlockIdx() > 0);

  protected readonly hasNextLesson = computed(() => {
    const all = this.allLessons();
    const idx = all.findIndex(x => x.lesson.id === this.selectedLessonId());
    return idx >= 0 && idx < all.length - 1;
  });

  protected readonly courseProgress = computed(() => {
    const c = this.course();
    if (!c) return 0;
    const totalBlocks = c.modules.flatMap(m => m.lessons).flatMap(l => l.contentBlocks).length;
    if (!totalBlocks) return 0;
    return Math.round((this.completedBlockIds().size / totalBlocks) * 100);
  });

  protected readonly isBlockComplete = computed(() => {
    const b = this.selectedBlock();
    return !!b && this.completedBlockIds().has(b.id);
  });

  constructor() {
    const snap = this.route.snapshot;
    this.courseId.set(snap.paramMap.get('id'));
    this.initialLessonId = snap.queryParams['lesson'] ?? null;
    this.initialBlockId  = snap.queryParams['block']  ?? null;

    // Auto-select initial lesson once course loads
    effect(() => {
      if (this.selectedLessonId() || !this.course()) return;
      const c = this.course()!;
      if (!c.modules.length) return;
      const lessonId: string | undefined =
        this.initialLessonId ??
        this.enrollment()?.progress.currentLessonId ??
        c.modules[0]?.lessons[0]?.id;
      if (!lessonId) return;
      this.selectedLessonId.set(lessonId);
      if (this.initialBlockId) {
        const lesson = c.modules.flatMap(m => m.lessons).find(l => l.id === lessonId);
        const blockIdx = lesson?.contentBlocks.findIndex(b => b.id === this.initialBlockId) ?? -1;
        if (blockIdx > -1) this.selectedBlockIdx.set(blockIdx);
      }
    });
  }

  ngOnInit(): void {
    if (this.courseUc.courses().length === 0) this.courseUc.load();
    if (this.enrollmentUc.enrollments().length === 0) this.enrollmentUc.loadEnrollments();
  }

  // ── Navigation methods ───────────────────────────────────────────────────────
  protected selectLesson(lessonId: string): void {
    if (this.selectedLessonId() === lessonId) return;
    this.selectedLessonId.set(lessonId);
    this.selectedBlockIdx.set(0);
    const enrollment = this.enrollment();
    if (enrollment) this.enrollmentUc.updateProgress(enrollment.id, lessonId, '');
  }

  protected nextBlock(): void {
    if (this.hasNextBlock()) {
      this.selectedBlockIdx.update(i => i + 1);
    } else if (this.hasNextLesson()) {
      const all = this.allLessons();
      const nextIdx = all.findIndex(x => x.lesson.id === this.selectedLessonId()) + 1;
      if (nextIdx < all.length) this.selectLesson(all[nextIdx].lesson.id);
    }
  }

  protected prevBlock(): void {
    if (this.hasPrevBlock()) this.selectedBlockIdx.update(i => i - 1);
  }

  protected markComplete(): void {
    const block = this.selectedBlock();
    if (!block) return;
    this.completedBlockIds.update(s => new Set([...s, block.id]));
    if (this.hasNextBlock() || this.hasNextLesson()) this.nextBlock();
  }

  protected startSidebarResize(event: MouseEvent): void {
    event.preventDefault();
    const startX     = event.clientX;
    const startWidth = this.sidebarWidth();
    const onMove = (e: MouseEvent) => {
      const delta = startX - e.clientX;
      this.sidebarWidth.set(Math.min(720, Math.max(320, startWidth + delta)));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  protected handleQuizSubmit(payload: IQuizSubmitPayload): void {
    this.enrollmentUc.submitQuiz(payload);
    this.completedBlockIds.update(s => new Set([...s, payload.blockId]));
  }

  protected handleAssignmentSubmit(payload: IAssignmentSubmitPayload): void {
    this.enrollmentUc.submitAssignment(payload);
    this.completedBlockIds.update(s => new Set([...s, payload.blockId]));
  }

  protected goHome(): void { this.router.navigate(['/learn/home']); }
}
