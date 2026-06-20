import {
  Component, inject, OnInit, OnDestroy, signal, computed,
  ChangeDetectionStrategy, HostListener, effect
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CoursePlayerUseCase } from '../../../../application/course-player.usecase';
import { LoadingSkeletonComponent, EmptyStateComponent } from 'shared';
import { PlayerTopbar } from '../../components/player-topbar/player-topbar';
import { PlayerSidebar } from '../../components/player-sidebar/player-sidebar';
import { PlayerContentBlock } from '../../components/player-content-block/player-content-block';
import { CourseCertificate } from '../../components/course-certificate/course-certificate';
import {
  IQuizSubmitPayload, IAssignmentSubmitPayload,
  IAssignmentSubmission, ICourseCertificate
} from '../../../../domain/model/player.model';
import { MOCK_STUDENTS, MOCK_USER_ID } from '../../../services/enrollment.service';
import { AuthSessionService } from 'auth';

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
export class CoursePlayerContainer implements OnInit, OnDestroy {
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly uc   = inject(CoursePlayerUseCase);
  private readonly authSession = inject(AuthSessionService);

  protected readonly sidebarWidthPx = signal<number | null>(null);
  protected readonly showCertificate = signal(false);

  // ── Time tracking ──────────────────────────────────────────────────────────
  private _timePerLesson = new Map<string, number>(); // lessonId → elapsed seconds
  private _tickInterval: ReturnType<typeof setInterval> | null = null;
  private _lastActivity = Date.now();
  private _paused = false;

  // ── Submissions ────────────────────────────────────────────────────────────
  private readonly _submissions = signal<Record<string, IAssignmentSubmission>>({});

  protected readonly currentSubmission = computed((): IAssignmentSubmission | null => {
    const blockId = this.uc.selectedBlock()?.id;
    return blockId ? (this._submissions()[blockId] ?? null) : null;
  });

  protected readonly certificate = computed((): ICourseCertificate | null => {
    const c = this.uc.course();
    if (!c || this.uc.courseProgress() < 100) return null;
    
    const user = this.authSession.user();
    let studentName = 'Estudiante';
    if (user) {
      studentName = `${user.firstName} ${user.lastName}`.trim();
    } else {
      const student = MOCK_STUDENTS.find(s => s.id === MOCK_USER_ID);
      if (student) {
        studentName = `${student.firstName} ${student.lastName}`;
      }
    }

    return {
      courseId:        c.id,
      courseTitle:     c.title,
      studentName:     studentName,
      completedAt:     new Date(),
      certificateId:   `CERT-${c.id.slice(0, 8).toUpperCase()}`,
      instructorName:  c.instructorName,
      institutionName: 'GEMS LMS',
    };
  });

  constructor() {
    // Re-start tick when lesson changes
    effect(() => {
      const lessonId = this.uc.selectedLessonId();
      if (!lessonId) return;
      this._startTick();
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
    const lessonId = this.uc.selectedLessonId();
    if (!lessonId) return;

    const idle = Date.now() - this._lastActivity;
    if (idle >= INACTIVITY_THRESHOLD_MS) {
      this._paused = true;
    }

    if (this._paused) return;

    const prev = this._timePerLesson.get(lessonId) ?? 0;
    const next = prev + 1;
    this._timePerLesson.set(lessonId, next);

    const threshold = this._lessonDurationSeconds(lessonId);
    if (threshold > 0 && next >= threshold) {
      this._markLessonComplete(lessonId);
    }
  }

  private _lessonDurationSeconds(lessonId: string): number {
    const course = this.uc.course();
    if (!course) return 0;
    for (const mod of course.modules) {
      const lesson = mod.lessons.find(l => l.id === lessonId);
      if (lesson) return (lesson.duration ?? 0) * 60;
    }
    return 0;
  }

  private _markLessonComplete(lessonId: string): void {
    const course = this.uc.course();
    if (!course) return;
    for (const mod of course.modules) {
      const lesson = mod.lessons.find(l => l.id === lessonId);
      if (lesson) {
        for (const block of lesson.contentBlocks) {
          if (!this.uc.completedBlockIds().has(block.id)) {
            // Use the use case's markComplete but we need to set specific block
            // We'll call selectBlock then markComplete for each incomplete block
          }
        }
        // Mark via use case — select each block and mark
        lesson.contentBlocks.forEach(block => {
          if (!this.uc.completedBlockIds().has(block.id)) {
            this.uc.markBlockComplete(block.id);
          }
        });
        return;
      }
    }
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

  protected goHome(): void { this.router.navigate(['/learn/home']); }

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
}
