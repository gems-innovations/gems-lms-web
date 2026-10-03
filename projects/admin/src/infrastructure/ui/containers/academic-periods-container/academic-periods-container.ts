import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  PageComponent, PageHeaderComponent, LibButtonComponent, LoadingSkeletonComponent, EmptyStateComponent,
  ConfirmationDialogComponent, ToastService,
} from 'shared';
import { EnrollmentRulesService } from 'education';
import type { IAcademicPeriod } from 'education';

/** Academic periods of the institution. Courses use them for their enrollment window. */
@Component({
  selector: 'adm-academic-periods-container',
  standalone: true,
  imports: [FormsModule, PageComponent, PageHeaderComponent, LibButtonComponent, LoadingSkeletonComponent,
    EmptyStateComponent, ConfirmationDialogComponent],
  templateUrl: './academic-periods-container.html',
  styleUrl: './academic-periods-container.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AcademicPeriodsContainer implements OnInit {
  private readonly service = inject(EnrollmentRulesService);
  private readonly toast = inject(ToastService);

  protected readonly state   = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly periods = signal<IAcademicPeriod[]>([]);
  protected readonly draft   = signal<{ id?: string; name: string; startsOn: string; endsOn: string } | null>(null);
  protected readonly saving  = signal(false);
  protected readonly pendingDelete = signal<IAcademicPeriod | null>(null);

  protected readonly problem = computed<string | null>(() => {
    const d = this.draft();
    if (!d) return null;
    if (!d.name.trim()) return 'Escribe el nombre del período';
    if (!d.startsOn || !d.endsOn) return 'Indica el inicio y el fin';
    if (d.endsOn < d.startsOn) return 'El período debe terminar después de empezar';
    return null;
  });

  /** Today, to mark the current period. */
  private readonly today = new Date().toISOString().slice(0, 10);

  ngOnInit(): void { this.load(); }

  private load(): void {
    this.state.set('loading');
    this.service.periods().subscribe({
      next: list => { this.periods.set(list); this.state.set('ready'); },
      error: () => this.state.set('error'),
    });
  }

  protected isCurrent(p: IAcademicPeriod): boolean { return p.startsOn <= this.today && this.today <= p.endsOn; }

  protected create(): void { this.draft.set({ name: '', startsOn: '', endsOn: '' }); }
  protected edit(p: IAcademicPeriod): void { this.draft.set({ ...p }); }
  protected patch(change: Partial<{ name: string; startsOn: string; endsOn: string }>): void {
    this.draft.update(d => d ? { ...d, ...change } : d);
  }

  protected save(): void {
    const d = this.draft();
    if (!d || this.problem() || this.saving()) return;
    this.saving.set(true);
    this.service.savePeriod({ name: d.name.trim(), startsOn: d.startsOn, endsOn: d.endsOn }, d.id).subscribe({
      next: () => { this.saving.set(false); this.draft.set(null); this.toast.success('Período guardado'); this.load(); },
      error: err => { this.saving.set(false); this.toast.error(err?.error?.message ?? 'No se pudo guardar el período'); },
    });
  }

  protected confirmDelete(): void {
    const p = this.pendingDelete();
    if (!p) return;
    this.service.deletePeriod(p.id).subscribe({
      next: () => { this.pendingDelete.set(null); this.toast.success('Período eliminado'); this.load(); },
      error: () => { this.pendingDelete.set(null); this.toast.error('No se pudo eliminar el período'); },
    });
  }
}
