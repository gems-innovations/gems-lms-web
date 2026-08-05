import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'lib-pagination',
  standalone: true,
  template: `
    <div class="pagination" [class.pagination--hidden]="totalPages() <= 1">
      <button
        type="button"
        class="pagination__btn"
        [disabled]="page() === 1"
        (click)="pageChange.emit(page() - 1)"
        aria-label="Anterior"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      @for (p of pages(); track p) {
        <button
          type="button"
          class="pagination__btn"
          [class.pagination__btn--active]="page() === p"
          (click)="pageChange.emit(p)"
        >
          {{ p }}
        </button>
      }

      <button
        type="button"
        class="pagination__btn"
        [disabled]="page() === totalPages()"
        (click)="pageChange.emit(page() + 1)"
        aria-label="Siguiente"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  `,
  styleUrl: './pagination.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginationComponent {
  readonly page       = input.required<number>();
  readonly totalPages = input.required<number>();

  readonly pageChange = output<number>();

  protected readonly pages = computed(() =>
    Array.from({ length: Math.max(1, this.totalPages()) }, (_, i) => i + 1)
  );
}
