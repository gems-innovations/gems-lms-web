import { Component, ChangeDetectionStrategy, DestroyRef, PLATFORM_ID, inject, signal, input } from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, startWith, switchMap } from 'rxjs';
import { NotificationService, IInstructorNotification } from '../../../services/notification.service';

const REFRESH_MS = 60_000;

/** Bell with the unread count and a panel listing the user's notifications. */
@Component({
  selector: 'edu-notification-bell',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.scss',
})
export class NotificationBell {
  protected readonly service = inject(NotificationService);
  private readonly router = inject(Router);
  /** Where the panel opens relative to the bell. */
  readonly align = input<'left' | 'right'>('right');
  /** Opens the panel upwards (e.g. when the bell sits at the bottom of a sidebar). */
  readonly up = input(false);

  protected readonly open = signal(false);

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    interval(REFRESH_MS).pipe(
      startWith(0),
      switchMap(() => this.service.refresh()),
      takeUntilDestroyed(inject(DestroyRef))
    ).subscribe();
  }

  protected toggle(): void {
    this.open.update(v => !v);
  }

  /** Marks it read and opens what it is about. */
  protected select(n: IInstructorNotification): void {
    if (!n.read) this.service.markRead(n.id);
    const target = this.target(n);
    if (target) {
      this.open.set(false);
      this.router.navigate(target.path, { queryParams: target.query });
    }
  }

  private target(n: IInstructorNotification): { path: string[]; query?: Record<string, string> } | null {
    if (!n.courseId) return null;
    const staffArea = this.router.url.startsWith('/instructor');
    if (staffArea) return { path: ['/instructor/courses', n.courseId] };
    switch (n.type) {
      case 'graded': return { path: ['/learn/courses', n.courseId, 'grades'] };
      case 'announcement': return { path: ['/learn/courses', n.courseId, 'community'] };
      case 'forum': return { path: ['/learn/courses', n.courseId, 'community'], query: { tab: 'forum', ...(n.submissionId ? { thread: n.submissionId } : {}) } };
      default: return { path: ['/learn/courses', n.courseId] };
    }
  }
}
