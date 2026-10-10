import { Component, ElementRef, input, output, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { EDifficulty } from '../../../../domain/model/course.model';
import { TCatalogKindFilter, TCatalogLevelFilter } from '../../../../domain/model/catalog.model';
import { DIFFICULTY_LABELS } from '../../utils/course-labels';

@Component({
  selector: 'edu-catalog-filter-bar',
  standalone: true,
  host: { style: 'display:block' },
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

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
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

  protected toggleFilter(): void {
    const opening = !this.filterOpen();
    this.filterOpen.set(opening);
    if (opening && typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches) {
      this.host.nativeElement.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }
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
