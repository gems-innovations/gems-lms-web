import { Component, OnDestroy, computed, input, linkedSignal, output } from '@angular/core';

@Component({
  selector: 'lib-search-bar',
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.scss'
})
export class SearchBarComponent implements OnDestroy {
  readonly placeholder = input<string>('Buscar...');
  readonly debounceTime = input<number>(300);
  readonly value = input<string>('');

  readonly search = output<string>();
  readonly clear = output<void>();

  protected readonly term = linkedSignal(() => this.value());
  protected readonly hasValue = computed(() => this.term().length > 0);

  private debounceTimer?: ReturnType<typeof setTimeout>;
  private lastEmitted?: string;

  protected onInput(value: string): void {
    this.term.set(value);
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      if (value !== this.lastEmitted) {
        this.lastEmitted = value;
        this.search.emit(value);
      }
    }, this.debounceTime());
  }

  protected onClear(): void {
    clearTimeout(this.debounceTimer);
    this.term.set('');
    this.lastEmitted = '';
    this.clear.emit();
  }

  ngOnDestroy(): void {
    clearTimeout(this.debounceTimer);
  }
}
