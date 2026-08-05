import {
  Component, ElementRef, HostListener, computed, effect, input, model,
  output, signal, viewChild, ChangeDetectionStrategy,
} from '@angular/core';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

// Umbral a partir del cual mostramos el buscador (por debajo, sobra con la lista).
const SEARCH_THRESHOLD = 6;

@Component({
  selector: 'lib-select',
  templateUrl: './lib-select.html',
  styleUrl: './lib-select.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LibSelectComponent {
  readonly value       = model<string>('');
  readonly disabled    = input<boolean>(false);
  readonly required    = input<boolean>(false);

  readonly label       = input<string>('');
  readonly placeholder = input<string>('Selecciona una opción');
  readonly helpText    = input<string>('');
  readonly options     = input<SelectOption[]>([]);
  readonly icon        = input<string | undefined>(undefined);
  /** Alto máximo (px) de la lista antes de hacer scroll. */
  readonly maxHeight   = input<number>(240);

  readonly touch = output<void>();

  protected readonly open   = signal(false);
  protected readonly search = signal('');

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  private readonly host        = viewChild<ElementRef<HTMLElement>>('rootEl');

  protected readonly showSearch = computed(() => this.options().length > SEARCH_THRESHOLD);

  protected readonly filteredOptions = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.options();
    return this.options().filter(o => o.label.toLowerCase().includes(q));
  });

  protected readonly selectedOption = computed(() =>
    this.options().find(o => o.value === this.value()) ?? null
  );

  protected readonly selectId = computed(
    () => `lib-select-${this.label().toLowerCase().replace(/\s+/g, '-')}`
  );

  constructor() {
    // Al abrir, enfoca el buscador (si aplica) en el siguiente tick.
    effect(() => {
      if (!this.open()) return;
      const input = this.searchInput()?.nativeElement;
      if (input) queueMicrotask(() => input.focus());
    });
  }

  protected toggle(): void {
    if (this.disabled()) return;
    this.open() ? this.close() : this.openPanel();
  }

  protected openPanel(): void {
    this.search.set('');
    this.open.set(true);
  }

  protected close(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.touch.emit();
  }

  protected selectOption(opt: SelectOption): void {
    if (opt.disabled) return;
    this.value.set(opt.value);
    this.close();
  }

  protected onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') { event.stopPropagation(); this.close(); }
    if (event.key === 'Enter') {
      event.preventDefault();
      const first = this.filteredOptions().find(o => !o.disabled);
      if (first) this.selectOption(first);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open()) return;
    const el = this.host()?.nativeElement;
    if (el && !el.contains(event.target as Node)) this.close();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.close(); }
}
