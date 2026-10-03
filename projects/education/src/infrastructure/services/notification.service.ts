import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap, catchError, of } from 'rxjs';
import { environment } from 'shared';

export interface IInstructorNotification {
  id: string;
  type: 'submission' | 'graded';
  title: string;
  message: string;
  courseId: string;
  submissionId?: string;
  createdAt: Date;
  read: boolean;
}

interface INotificationApi {
  id: number;
  type: 'submission' | 'graded';
  title: string;
  message: string;
  courseId: number | null;
  referenceId: number | null;
  createdAt: string;
  read: boolean;
}

function mapNotification(n: INotificationApi): IInstructorNotification {
  return {
    id: String(n.id),
    type: n.type,
    title: n.title,
    message: n.message,
    courseId: n.courseId == null ? '' : String(n.courseId),
    submissionId: n.referenceId == null ? undefined : String(n.referenceId),
    createdAt: new Date(n.createdAt),
    read: n.read,
  };
}

/**
 * The signed-in user's notifications, created by the API (an assignment delivered → the
 * institution's staff; an assignment graded → the student). Call {@link refresh} to update.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrls.education.notifications;

  private readonly _notifications = signal<IInstructorNotification[]>([]);

  readonly notifications = computed(() =>
    [...this._notifications()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  );

  readonly unreadCount = computed(() => this._notifications().filter(n => !n.read).length);

  /** Reloads the list; failures keep the current one (the bell is never critical). */
  refresh(): Observable<IInstructorNotification[]> {
    return this.http.get<INotificationApi[]>(this.url).pipe(
      map(list => list.map(mapNotification)),
      tap(list => this._notifications.set(list)),
      catchError(() => of(this._notifications()))
    );
  }

  markRead(id: string): void {
    this._notifications.update(list => list.map(n => n.id === id ? { ...n, read: true } : n));
    this.http.put(`${this.url}/${id}/read`, null).pipe(catchError(() => of(null))).subscribe();
  }

  markAllRead(): void {
    this._notifications.update(list => list.map(n => ({ ...n, read: true })));
    this.http.put(`${this.url}/read-all`, null).pipe(catchError(() => of(null))).subscribe();
  }
}
