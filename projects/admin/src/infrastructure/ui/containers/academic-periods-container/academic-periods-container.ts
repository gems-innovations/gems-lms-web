import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  PageComponent, PageHeaderComponent, LibButtonComponent, LoadingSkeletonComponent, EmptyStateComponent,
  ConfirmationDialogComponent, ToastService,
} from 'shared';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { EnrollmentRulesService } from 'education';
import type { IAcademicPeriod } from 'education';
import { AuthSessionService } from 'auth';
import { BrandingService, environment } from 'shared';
import { downloadActaCsv, downloadActaPdf, IActaPerson } from '../../../../application/period-acta';

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
  private readonly http = inject(HttpClient);
  private readonly session = inject(AuthSessionService);
  private readonly branding = inject(BrandingService);

  protected readonly state   = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly periods = signal<IAcademicPeriod[]>([]);
  protected readonly draft   = signal<{ id?: string; name: string; startsOn: string; endsOn: string } | null>(null);
  protected readonly saving  = signal(false);
  protected readonly pendingDelete = signal<IAcademicPeriod | null>(null);
  protected readonly pendingClose  = signal<IAcademicPeriod | null>(null);
  protected readonly pendingReopen = signal<IAcademicPeriod | null>(null);
  protected readonly busyId = signal<string | null>(null);

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

  protected closedOn(p: IAcademicPeriod): string {
    return p.closedAt ? new Date(p.closedAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  }

  protected confirmClose(): void {
    const p = this.pendingClose();
    if (!p) return;
    this.pendingClose.set(null);
    this.busyId.set(p.id);
    this.service.closePeriod(p.id).subscribe({
      next: r => {
        this.busyId.set(null);
        this.toast.success(`${p.name} cerrado: ${r.students} notas en ${r.courses} cursos (${r.passed} aprobados, ${r.failed} no aprobados).`);
        this.load();
      },
      error: err => { this.busyId.set(null); this.toast.error(err?.error?.message ?? 'No se pudo cerrar el período'); },
    });
  }

  protected confirmReopen(): void {
    const p = this.pendingReopen();
    if (!p) return;
    this.pendingReopen.set(null);
    this.service.reopenPeriod(p.id).subscribe({
      next: () => { this.toast.success(`${p.name} reabierto`); this.load(); },
      error: () => this.toast.error('No se pudo reabrir el período'),
    });
  }

  /** Actas con nombre y correo de cada estudiante (la API guarda solo su id). */
  protected async downloadActas(p: IAcademicPeriod, format: 'pdf' | 'csv'): Promise<void> {
    this.busyId.set(p.id);
    try {
      const institution = p.institutionId ?? this.session.institutionId() ?? '';
      const [records, users] = await Promise.all([
        firstValueFrom(this.service.periodRecords(p.id)),
        firstValueFrom(this.http.get<{ userId?: number; id?: number; firstName: string; lastName: string; email: string }[]>(
          `${environment.apiUrls.users}/institution/${encodeURIComponent(institution)}`)).catch(() => []),
      ]);
      const people = new Map<string, IActaPerson>(users.map(u => [String(u.userId ?? u.id),
        { name: `${u.firstName} ${u.lastName}`.trim(), email: u.email }]));
      if (format === 'csv') downloadActaCsv(p, records, people);
      else await downloadActaPdf(p, records, people, this.branding.institutionName() ?? 'Institución');
    } catch {
      this.toast.error('No se pudieron generar las actas');
    } finally {
      this.busyId.set(null);
    }
  }
}
