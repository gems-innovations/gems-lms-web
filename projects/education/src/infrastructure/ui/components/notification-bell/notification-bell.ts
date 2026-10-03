import { Component, ChangeDetectionStrategy, DestroyRef, PLATFORM_ID, inject, signal, input } from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
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

  protected select(n: IInstructorNotification): void {
    if (!n.read) this.service.markRead(n.id);
  }
}
