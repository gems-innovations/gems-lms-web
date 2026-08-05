import {
  Component, input, output, inject, signal, computed, viewChild, ElementRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  AvatarComponent, BackButtonComponent, BadgeComponent, ProgressBarComponent,
  LibButtonComponent, RadarChartComponent, EmptyStateComponent,
} from 'shared';
import type { IRadarSeries } from 'shared';
import { ExportUseCase } from '../../../../application/export.usecase';
import type { IEnrollmentRow, IStudentGradeRow } from '../../../../domain/model/instructor.model';

interface IRadarData { axes: string[]; studentValues: number[]; groupValues: number[]; }

@Component({
  selector: 'ins-student-detail',
  standalone: true,
  imports: [
    AvatarComponent, BackButtonComponent, BadgeComponent, ProgressBarComponent,
    LibButtonComponent, RadarChartComponent, EmptyStateComponent,
  ],
  templateUrl: './student-detail.html',
  styleUrl: './student-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentDetail {
  readonly enrollment = input.required<IEnrollmentRow>();
  readonly gradeRows  = input.required<IStudentGradeRow[]>();
  readonly radar      = input.required<IRadarData>();
  readonly courseTitle = input.required<string>();

  readonly back = output<void>();

  private readonly exportUc = inject(ExportUseCase);
  private readonly radarBox = viewChild<ElementRef<HTMLElement>>('radarBox');

  protected readonly exporting = signal(false);

  protected readonly fullName = computed(() => {
    const s = this.enrollment().student;
    return `${s.firstName} ${s.lastName}`;
  });

  protected readonly avgGrade = computed(() => {
    const graded = this.gradeRows().filter(r => r.grade != null);
    return graded.length
      ? Math.round(graded.reduce((a, r) => a + (r.grade ?? 0), 0) / graded.length)
      : null;
  });

  protected readonly hasRadar = computed(() => this.radar().axes.length >= 3);

  protected readonly radarSeries = computed<IRadarSeries[]>(() => [
    { label: this.fullName(), color: 'var(--color-primario)', values: this.radar().studentValues },
    { label: 'Promedio del grupo', color: 'var(--color-teal)', values: this.radar().groupValues },
  ]);

  protected gradeClass(grade: number | null): string {
    if (grade == null) return '';
    if (grade >= 80) return 'sdet__grade--high';
    if (grade >= 60) return 'sdet__grade--mid';
    return 'sdet__grade--low';
  }

  protected statusLabel(status: string): string {
    const map: Record<string, string> = {
      graded: 'Calificado', pending: 'Pendiente', returned: 'Devuelto', missing: 'No entregó',
    };
    return map[status] ?? status;
  }

  protected async exportPdf(): Promise<void> {
    this.exporting.set(true);
    try {
      await this.exportUc.studentReportPdf(
        this.courseTitle(),
        this.fullName(),
        this.enrollment().student.email,
        this.enrollment().progress?.overallPercentage ?? 0,
        this.gradeRows(),
        this.hasRadar() ? this.radarBox()?.nativeElement ?? null : null,
      );
    } finally {
      this.exporting.set(false);
    }
  }
}
