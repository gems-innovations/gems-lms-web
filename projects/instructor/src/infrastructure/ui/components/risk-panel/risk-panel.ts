import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import {
  AvatarComponent, EmptyStateComponent, LibButtonComponent, LoadingSkeletonComponent, RevealDirective, ToastService,
} from 'shared';
import { AtRiskService } from '../../../services/at-risk.service';
import type { ICourseRisk } from '../../../services/at-risk.service';
import type { IEnrollmentRow } from '../../../../domain/model/instructor.model';

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
  private readonly risks = inject(AtRiskService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private loading?: Subscription;

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
    this.loading?.unsubscribe();
    this.loading = this.risks.forCourse(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: r => { this.data.set(r); this.state.set('ready'); },
      error: () => this.state.set('error'),
    });
  }

  protected compose(studentId: string): void {
    this.composing.set(this.composing() === studentId ? null : studentId);
    this.message.set('');
  }

  protected remind(studentId: string): void {
    this.sending.set(studentId);
    this.risks.remind(this.courseId(), studentId, this.message()).subscribe({
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
