import { Component, input, output, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AvatarComponent, EmptyStateComponent, LibButtonComponent, LoadingSkeletonComponent } from 'shared';
import type { IGradebookCell, IGradebookItem } from 'education';
import type { IGradebookStudentRow } from '../../../../domain/model/instructor.model';

/** Course gradebook: one column per quiz or assignment, weighted course grade per student. */
@Component({
  selector: 'ins-gradebook-panel',
  standalone: true,
  imports: [DecimalPipe, FormsModule, AvatarComponent, EmptyStateComponent, LibButtonComponent, LoadingSkeletonComponent],
  templateUrl: './gradebook-panel.html',
  styleUrl: './gradebook-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GradebookPanel {
  readonly items   = input<IGradebookItem[]>([]);
  readonly rows    = input<IGradebookStudentRow[]>([]);
  readonly loading = input(false);
  readonly error   = input<string | null>(null);

  readonly saveWeights = output<Record<string, number>>();
  readonly exportExcel = output<void>();
  readonly openSubmission = output<{ blockId: string; studentId: string }>();

  protected readonly editingWeights = signal(false);
  protected readonly weightDraft    = signal<Record<string, number>>({});

  protected readonly totalWeight = computed(() => this.items().reduce((a, i) => a + i.weight, 0));

  protected readonly weightsValid = computed(() => {
    const draft = this.weightDraft();
    const values = this.items().map(i => draft[i.blockId]);
    return values.every(v => Number.isInteger(v) && v >= 0 && v <= 100) && values.some(v => v > 0);
  });

  /** Promedio del grupo por columna (solo lo calificado). */
  protected readonly columnAverages = computed(() => this.items().map(item => {
    const scores = this.rows()
      .map(r => r.cells.find(c => c.blockId === item.blockId)?.score)
      .filter((s): s is number => s != null);
    return scores.length ? scores.reduce((a, s) => a + s, 0) / scores.length : null;
  }));

  constructor() {
    effect(() => {
      if (!this.editingWeights()) {
        this.weightDraft.set(Object.fromEntries(this.items().map(i => [i.blockId, i.weight])));
      }
    });
  }

  protected cell(row: IGradebookStudentRow, blockId: string): IGradebookCell | undefined {
    return row.cells.find(c => c.blockId === blockId);
  }

  protected share(item: IGradebookItem): number {
    const total = this.totalWeight();
    return total ? Math.round(item.weight * 100 / total) : 0;
  }

  protected gradeClass(score: number | null | undefined): string {
    if (score == null) return '';
    if (score >= 80) return 'gbook__score--high';
    if (score >= 60) return 'gbook__score--mid';
    return 'gbook__score--low';
  }

  protected setWeight(blockId: string, value: number): void {
    this.weightDraft.update(d => ({ ...d, [blockId]: value }));
  }

  protected startEditing(): void {
    this.weightDraft.set(Object.fromEntries(this.items().map(i => [i.blockId, i.weight])));
    this.editingWeights.set(true);
  }

  protected cancelEditing(): void { this.editingWeights.set(false); }

  protected submitWeights(): void {
    if (!this.weightsValid()) return;
    this.saveWeights.emit({ ...this.weightDraft() });
    this.editingWeights.set(false);
  }

  protected open(row: IGradebookStudentRow, item: IGradebookItem): void {
    const cell = this.cell(row, item.blockId);
    if (item.type === 'assignment' && cell?.submissionId) {
      this.openSubmission.emit({ blockId: item.blockId, studentId: row.studentId });
    }
  }
}
