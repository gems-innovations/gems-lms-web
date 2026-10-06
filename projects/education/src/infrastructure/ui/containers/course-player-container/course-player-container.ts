import {
  Component, inject, OnInit, OnDestroy, signal, computed,
  ChangeDetectionStrategy, HostListener, effect
} from '@angular/core';
import { celebrate } from 'shared';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Observable } from 'rxjs';
import { CoursePlayerUseCase } from '../../../../application/course-player.usecase';
import { LoadingSkeletonComponent, EmptyStateComponent } from 'shared';
import { PlayerTopbar } from '../../components/player-topbar/player-topbar';
import { PlayerSidebar } from '../../components/player-sidebar/player-sidebar';
import { PlayerContentBlock } from '../../components/player-content-block/player-content-block';
import { CourseCertificate } from '../../components/course-certificate/course-certificate';
import { CanDeactivateQuiz } from '../../guards/quiz-deactivate.guard';
import {
  IQuizSubmitPayload, IAssignmentSubmitPayload,
  IAssignmentSubmission, ICourseCertificate
} from '../../../../domain/model/player.model';

const INACTIVITY_THRESHOLD_MS = 5 * 60 * 1000; // 5 min

@Component({
  selector: 'edu-course-player-container',
  standalone: true,
  imports: [
    LoadingSkeletonComponent, EmptyStateComponent,
    PlayerTopbar, PlayerSidebar, PlayerContentBlock, CourseCertificate
  ],
  templateUrl: './course-player-container.html',
  styleUrl: './course-player-container.scss',
  host: { style: 'display:block;height:100%' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoursePlayerContainer implements OnInit, OnDestroy, CanDeactivateQuiz {
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly uc   = inject(CoursePlayerUseCase);

  protected readonly sidebarWidthPx     = signal<number | null>(null);
  protected readonly showCertificate    = signal(false);
  protected readonly forceSubmitTrigger = signal(0);
  private readonly _quizActive          = signal(false);
  private readonly _pendingNav          = signal<(() => void) | null>(null);
  protected readonly showQuizWarning    = signal(false);
  private _deactivateSubject: Subject<boolean> | null = null;
  private _celebrationDone  = false;
  private _prevProgress     = -1; // tracks last seen progress to detect transition to 100%
  // ── Time tracking (per block) ──────────────────────────────────────────────
  private _timePerBlock  = new Map<string, number>(); // blockId → elapsed seconds
  private _tickInterval: ReturnType<typeof setInterval> | null = null;
  private _lastActivity  = Date.now();
  private _paused        = false;

  // ── Submissions ────────────────────────────────────────────────────────────
  private readonly _submissions = signal<Record<string, IAssignmentSubmission>>({});

  protected readonly currentSubmission = computed((): IAssignmentSubmission | null => {
    const blockId = this.uc.selectedBlock()?.id;
    return blockId ? (this._submissions()[blockId] ?? null) : null;
  });

  protected readonly certificate = computed((): ICourseCertificate | null => this.uc.certificate());

  constructor() {
    // Restart tick when selected block changes
    effect(() => {
      const block = this.uc.selectedBlock();
      if (!block) return;
      this._startTick();
    });

    // First-time course completion: confetti + auto-open certificate
    // Only fires when progress TRANSITIONS to 100 (not on reload of already-completed course)
    effect(() => {
      const progress = this.uc.courseProgress();
      const wasBelow = this._prevProgress >= 0 && this._prevProgress < 100;
      this._prevProgress = progress;
      if (progress === 100 && wasBelow && !this._celebrationDone) {
        this._celebrationDone = true;
        void celebrate();
        this.showCertificate.set(true);
      }
    });

    // Sync graded submissions from enrollment state into local display state
    effect(() => {
      const graded = this.uc.gradedSubmissions();
      if (!graded.length) return;
      this._submissions.update(map => {
        const next = { ...map };
        for (const sub of graded) {
          next[sub.blockId] = {
            submittedAt: sub.submittedAt,
            textContent: sub.textContent ?? '',
            fileName:    undefined,
            status:      'graded',
            grade: sub.grade != null ? {
              score:    sub.grade,
              maxScore: 100,
              feedback: sub.feedback ?? '',
              gradedAt: sub.submittedAt,
            } : undefined,
          };
        }
        return next;
      });
    });
  }

  ngOnInit(): void {
    const snap = this.route.snapshot;
    this.uc.init(
      snap.paramMap.get('id') ?? '',
      snap.queryParams['lesson'] ?? null,
      snap.queryParams['block']  ?? null,
    );
    this._startTick();
  }

  ngOnDestroy(): void {
    this._stopTick();
  }

  // ── Activity detection ─────────────────────────────────────────────────────
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this._quizActive()) {
      event.preventDefault();
    }
  }

  @HostListener('mousemove')
  onMouseMove(): void { this._onActivity(); }

  @HostListener('keydown')
  onKeyDown(): void { this._onActivity(); }

  @HostListener('click')
  onClick(): void { this._onActivity(); }

  @HostListener('scroll')
  onScroll(): void { this._onActivity(); }

  private _onActivity(): void {
    this._lastActivity = Date.now();
    this._paused = false;
  }

  // ── Tick ───────────────────────────────────────────────────────────────────
  private _startTick(): void {
    this._stopTick();
    this._lastActivity = Date.now();
    this._paused = false;
    this._tickInterval = setInterval(() => this._tick(), 1000);
  }

  private _stopTick(): void {
    if (this._tickInterval) {
      clearInterval(this._tickInterval);
      this._tickInterval = null;
    }
  }

  private _tick(): void {
    const block = this.uc.selectedBlock();
    if (!block) return;
    if (this.uc.isBlockComplete()) return; // already done, no need to count

    const idle = Date.now() - this._lastActivity;
    if (idle >= INACTIVITY_THRESHOLD_MS) this._paused = true;
    if (this._paused) return;

    const prev = this._timePerBlock.get(block.id) ?? 0;
    const next = prev + 1;
    this._timePerBlock.set(block.id, next);

    const threshold = this._blockThresholdSeconds(block);
    if (threshold > 0 && next >= threshold) {
      this.uc.markBlockComplete(block.id);
    }
  }

  private _blockThresholdSeconds(block: { minTimeSeconds?: number; duration?: number; type: string }): number {
    // Quiz and assignment complete via their own logic
    if (block.type === 'quiz' || block.type === 'assignment') return 0;
    if (block.minTimeSeconds && block.minTimeSeconds > 0) return block.minTimeSeconds;
    if (block.duration && block.duration > 0) return block.duration * 60;
    return 0;
  }

  // ── Sidebar resize ─────────────────────────────────────────────────────────
  protected startSidebarResize(event: MouseEvent): void {
    event.preventDefault();
    const handle     = (event.target as HTMLElement).closest('aside') as HTMLElement | null;
    const startWidth = handle ? handle.offsetWidth : 400;
    const startX     = event.clientX;

    const onMove = (e: MouseEvent): void => {
      const delta = startX - e.clientX;
      const newW  = Math.round(startWidth + delta);
      const bodyW = (event.target as HTMLElement).closest('.course-player-container__body') as HTMLElement | null;
      const maxW  = bodyW ? Math.round(bodyW.offsetWidth * 0.60) : 900;
      this.sidebarWidthPx.set(Math.min(maxW, Math.max(200, newW)));
    };
    const onUp = (): void => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // ── Quiz navigation guard ──────────────────────────────────────────────────
  canDeactivate(): Observable<boolean> | boolean {
    if (!this._quizActive()) return true;
    this._deactivateSubject = new Subject<boolean>();
    this.showQuizWarning.set(true);
    return this._deactivateSubject.asObservable();
  }

  onQuizPhaseChange(phase: string): void {
    this._quizActive.set(phase === 'taking');
  }

  onQuizForceSubmitted(): void {
    this._quizActive.set(false);
    const nav = this._pendingNav();
    this._pendingNav.set(null);
    nav?.();
    // Resolve deactivation guard if it was triggered externally
    if (this._deactivateSubject) {
      this._deactivateSubject.next(true);
      this._deactivateSubject.complete();
      this._deactivateSubject = null;
    }
  }

  protected _guardedNav(action: () => void): void {
    if (this._quizActive()) {
      this._pendingNav.set(action);
      this.showQuizWarning.set(true);
    } else {
      action();
    }
  }

  protected confirmQuizNav(): void {
    this.forceSubmitTrigger.update(n => n + 1);
    this.showQuizWarning.set(false);
    // Navigation executes in onQuizForceSubmitted after the submit completes
    // If triggered by the deactivate guard (no pending nav), resolve after submit
  }

  protected cancelQuizNav(): void {
    this._pendingNav.set(null);
    this.showQuizWarning.set(false);
    if (this._deactivateSubject) {
      this._deactivateSubject.next(false);
      this._deactivateSubject.complete();
      this._deactivateSubject = null;
    }
  }

  protected goHome(): void { this._guardedNav(() => this.router.navigate(['/learn/home'])); }
  protected openCommunity(): void {
    const id = this.uc.courseId();
    this._guardedNav(() => this.router.navigate(['/learn/courses', id, 'community']));
  }
  protected openGrades(): void {
    const id = this.uc.courseId();
    this._guardedNav(() => this.router.navigate(['/learn/courses', id, 'grades']));
  }

  protected handleQuizSubmit(payload: IQuizSubmitPayload): void {
    this.uc.handleQuizSubmit(payload);
  }

  protected handleAssignmentSubmit(payload: IAssignmentSubmitPayload): void {
    this.uc.handleAssignmentSubmit(payload);
    this._submissions.update(map => ({
      ...map,
      [payload.blockId]: {
        submittedAt: new Date(),
        textContent: payload.textContent,
        fileName:    payload.attachedFile?.name,
        status:      'pending_review',
      }
    }));
  }

  protected openCertificate(): void { this.showCertificate.set(true); }
  protected closeCertificate(): void { this.showCertificate.set(false); }

  protected openSurvey(): void {
    this._guardedNav(() => this.router.navigate(['/learn/courses', this.uc.courseId(), 'survey']));
  }
}
