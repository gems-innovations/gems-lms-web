import { Component, input, output, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { EDifficulty } from '../../../../domain/model/course.model';
import { DIFFICULTY_LABELS } from '../../utils/course-labels';

export type TCatalogKindFilter = 'all' | 'course' | 'path';
export type TCatalogLevelFilter = EDifficulty | 'all';

@Component({
  selector: 'edu-catalog-filter-bar',
  templateUrl: './catalog-filter-bar.html',
  styleUrl: './catalog-filter-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogFilterBar {
  readonly search      = input<string>('');
  readonly filterKind  = input<TCatalogKindFilter>('all');
  readonly filterLevel = input<TCatalogLevelFilter>('all');

  readonly searchChange      = output<string>();
  readonly filterKindChange  = output<TCatalogKindFilter>();
  readonly filterLevelChange = output<TCatalogLevelFilter>();

  protected readonly filterOpen = signal(false);

  protected readonly EDifficulty = EDifficulty;

  protected readonly activeFilterCount = computed(() => {
    let n = 0;
    if (this.filterKind()  !== 'all') n++;
    if (this.filterLevel() !== 'all') n++;
    return n;
  });

  protected difficultyLabel(d: EDifficulty): string {
    return DIFFICULTY_LABELS[d] ?? d;
  }

  protected toggleFilter(): void { this.filterOpen.update(v => !v); }
  protected closeFilter(): void  { this.filterOpen.set(false); }

  protected clearFilters(): void {
    this.filterKindChange.emit('all');
    this.filterLevelChange.emit('all');
  }

  protected setKind(kind: TCatalogKindFilter): void {
    this.filterKindChange.emit(kind);
    if (kind === 'path') this.filterLevelChange.emit('all');
  }
}
