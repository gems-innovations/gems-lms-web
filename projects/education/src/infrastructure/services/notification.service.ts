import { Injectable, signal, computed } from '@angular/core';

export interface IInstructorNotification {
  id: string;
  type: 'submission';
  title: string;
  message: string;
  courseId: string;
  submissionId?: string;
  createdAt: Date;
  read: boolean;
}

/**
 * In-memory notification center for the instructor.
 * EnrollmentService pushes a notification every time a student
 * submits an assignment; the instructor panel consumes the signals.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly _notifications = signal<IInstructorNotification[]>([
    {
      id: 'n1', type: 'submission',
      title: 'Nueva entrega de tarea',
      message: 'Sofia Torres entregó "Implementa un CRUD" en Desarrollo Full Stack con Angular y Node.js',
      courseId: 'c2', submissionId: 'sub2',
      createdAt: new Date('2025-05-21T10:30:00'), read: false
    },
    {
      id: 'n2', type: 'submission',
      title: 'Nueva entrega de tarea',
      message: 'Diego Ramírez entregó "Análisis exploratorio" en Introducción a la Inteligencia Artificial',
      courseId: 'c1', submissionId: 'sub6',
      createdAt: new Date('2025-05-23T15:12:00'), read: false
    },
    {
      id: 'n3', type: 'submission',
      title: 'Nueva entrega de tarea',
      message: 'Carlos López entregó "Integra PostgreSQL en tu API" en Desarrollo Full Stack con Angular y Node.js',
      courseId: 'c2', submissionId: 'sub4',
      createdAt: new Date('2025-05-22T09:05:00'), read: true
    }
  ]);

  readonly notifications = computed(() =>
    [...this._notifications()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  );

  readonly unreadCount = computed(() =>
    this._notifications().filter(n => !n.read).length
  );

  notifySubmission(studentName: string, assignmentTitle: string, courseTitle: string, courseId: string, submissionId: string): void {
    this._notifications.update(list => [
      {
        id: `n${Date.now()}`,
        type: 'submission',
        title: 'Nueva entrega de tarea',
        message: `${studentName} entregó "${assignmentTitle}" en ${courseTitle}`,
        courseId,
        submissionId,
        createdAt: new Date(),
        read: false
      },
      ...list
    ]);
  }

  markRead(id: string): void {
    this._notifications.update(list =>
      list.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }

  markAllRead(): void {
    this._notifications.update(list => list.map(n => ({ ...n, read: true })));
  }
}
