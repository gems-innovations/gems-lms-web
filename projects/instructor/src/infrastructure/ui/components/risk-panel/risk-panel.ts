import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import {
  AvatarComponent, EmptyStateComponent, LibButtonComponent, LoadingSkeletonComponent, RevealDirective, ToastService,
  environment,
} from 'shared';
import type { IEnrollmentRow } from '../../../../domain/model/instructor.model';

interface IRisk {
  studentId: string;
  score: number;
  level: 'high' | 'medium';
  reasons: string[];
  daysInactive: number | null;
  progress: number;
  currentGrade: number | null;
  missingItems: number;
}

interface ICourseRisk { students: number; high: number; medium: number; atRisk: IRisk[]; }

/**
 * Alerta temprana: estudiantes del curso que se están quedando atrás, con las razones y un
 * recordatorio dentro de la plataforma con un clic.
 */
@Component({
  selector: 'ins-risk-panel',
  imports: [FormsModule, AvatarComponent, EmptyStateComponent, LibButtonComponent, LoadingSkeletonComponent, RevealDirective],
  templateUrl: './risk-panel.html',
  styleUrl: './risk-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RiskPanel {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  readonly courseId = input.required<string>();
  readonly enrollments = input<IEnrollmentRow[]>([]);

  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly data = signal<ICourseRisk | null>(null);
  protected readonly filter = signal<'all' | 'high' | 'medium'>('all');
  protected readonly composing = signal<string | null>(null);
  protected readonly message = signal('');
  protected readonly sent = signal<Set<string>>(new Set());
  protected readonly sending = signal<string | null>(null);

  private readonly people = computed(() => new Map(this.enrollments().map(e => [String(e.student.id), e.student])));

  protected readonly rows = computed(() => {
    const f = this.filter();
    return (this.data()?.atRisk ?? []).filter(r => f === 'all' || r.level === f).map(r => {
      const s = this.people().get(r.studentId);
      return { ...r, name: s ? `${s.firstName} ${s.lastName}` : `Estudiante ${r.studentId}`, email: s?.email ?? '' };
    });
  });

  constructor() {
    effect(() => {
      const id = this.courseId();
      if (id) this.load(id);
    });
  }

  private load(id: string): void {
    this.state.set('loading');
    this.http.get<any>(`${environment.apiBaseUrl}/courses/${id}/at-risk`).subscribe({
      next: r => {
        this.data.set({ students: r.students, high: r.high, medium: r.medium,
          atRisk: r.atRisk.map((x: any) => ({ ...x, studentId: String(x.studentId) })) });
        this.state.set('ready');
      },
      error: () => this.state.set('error'),
    });
  }

  protected compose(studentId: string): void {
    this.composing.set(this.composing() === studentId ? null : studentId);
    this.message.set('');
  }

  protected remind(studentId: string): void {
    this.sending.set(studentId);
    this.http.post(`${environment.apiBaseUrl}/courses/${this.courseId()}/at-risk/${studentId}/remind`,
      { message: this.message().trim() || null }).subscribe({
      next: () => {
        this.sending.set(null);
        this.composing.set(null);
        this.sent.update(s => new Set(s).add(studentId));
        this.toast.success('Recordatorio enviado. El estudiante lo verá en sus notificaciones.');
      },
      error: () => { this.sending.set(null); this.toast.error('No se pudo enviar el recordatorio.'); },
    });
  }
}
