import { Component, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { IInstructorNotification } from '../../../services/notification.service';

@Component({
  selector: 'edu-instructor-notifications-panel',
  templateUrl: './instructor-notifications-panel.html',
  styleUrl: './instructor-notifications-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstructorNotificationsPanel {
  readonly notifications = input<IInstructorNotification[]>([]);
  readonly unreadCount   = input<number>(0);

  readonly markRead    = output<string>();
  readonly markAllRead = output<void>();
  readonly notificationClick = output<IInstructorNotification>();

  protected readonly open = signal(false);

  protected toggle(): void { this.open.update(v => !v); }
  protected close(): void  { this.open.set(false); }

  protected timeAgo(date: Date): string {
    const diffMs = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `hace ${Math.max(mins, 1)} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    return `hace ${Math.floor(hours / 24)}d`;
  }

  protected select(n: IInstructorNotification): void {
    this.markRead.emit(n.id);
    this.notificationClick.emit(n);
    this.close();
  }
}
