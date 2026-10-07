import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageComponent, PageHeaderComponent } from 'shared';
import { AuthSessionService } from 'auth';
import { IInstitutionReport } from '../../../../domain/model/institution-report.model';
import { InstitutionReportService } from '../../../services/institution-report.service';

@Component({
  selector: 'adm-institution-reports-container',
  imports: [CommonModule, PageComponent, PageHeaderComponent],
  templateUrl: './institution-reports-container.html',
  styleUrl: './institution-reports-container.scss'
})
export class InstitutionReportsContainer implements OnInit {
  private readonly reports = inject(InstitutionReportService);
  private readonly auth = inject(AuthSessionService);
  readonly report = signal<IInstitutionReport | null>(null);
  readonly loading = signal(false);
  readonly exporting = signal(false);
  readonly error = signal<string | null>(null);
  readonly courseProgress = computed(() => [...(this.report()?.courses ?? [])]
    .sort((a, b) => b.averageProgress - a.averageProgress).slice(0, 6));

  barWidth(progress: number): string { return `${Math.min(100, Math.max(0, progress))}%`; }

  ngOnInit(): void { this.load(); }
  load(): void {
    const institutionId = this.auth.institutionId();
    if (!institutionId) { this.error.set('No se encontró una institución asociada a tu cuenta.'); return; }
    this.loading.set(true); this.error.set(null);
    this.reports.get(institutionId).subscribe({
      next: report => { this.report.set(report); this.loading.set(false); },
      error: () => { this.error.set('No se pudo generar el reporte.'); this.loading.set(false); }
    });
  }
  exportCsv(): void {
    const institutionId = this.auth.institutionId();
    if (!institutionId) return;
    this.exporting.set(true);
    this.reports.exportCsv(institutionId).subscribe({
      next: blob => { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'reporte-institucion.csv'; link.click(); URL.revokeObjectURL(url); this.exporting.set(false); },
      error: () => { this.error.set('No se pudo exportar el reporte.'); this.exporting.set(false); }
    });
  }
}
