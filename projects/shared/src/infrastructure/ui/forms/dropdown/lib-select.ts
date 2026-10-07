import {
  Component, ElementRef, HostListener, computed, effect, forwardRef, input, model,
  output, signal, viewChild, ChangeDetectionStrategy,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslatePipe } from '../../pipes/translate.pipe';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  /** Texto secundario bajo la etiqueta (p. ej. fechas de un período). */
  hint?: string;
}

// Umbral a partir del cual mostramos el buscador (por debajo, sobra con la lista).
const SEARCH_THRESHOLD = 6;
// Separación entre el disparador y el panel, y margen mínimo con el borde de la ventana.
const GAP = 6;
const VIEWPORT_MARGIN = 8;

let nextId = 0;
// Marca interna de la opción «Crear …» (el valor es el texto escrito).
const CREATE_HINT = '__create__';

/**
 * Lista desplegable de la plataforma. Funciona con [(value)] o con ngModel / formControl.
 * Teclado: flechas, Inicio/Fin, Enter/Espacio, Escape y búsqueda escribiendo las primeras letras.
 * El panel se posiciona fijo respecto a la ventana, así no lo recorta un modal o una tabla con
 * scroll, y se abre hacia arriba cuando no cabe debajo.
 */
@Component({
  selector: 'lib-select',
  templateUrl: './lib-select.html',
  styleUrl: './lib-select.scss',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => LibSelectComponent), multi: true }],
})
export class LibSelectComponent implements ControlValueAccessor {
  readonly value       = model<string>('');
  readonly disabled    = input<boolean>(false);
  readonly required    = input<boolean>(false);

  readonly label       = input<string>('');
  /** Nombre accesible cuando la etiqueta visible está fuera del componente. */
  readonly ariaLabel   = input<string>('');
  /** id del disparador, para asociarlo a un <label for> externo. */
  readonly inputId     = input<string>('');
  readonly placeholder = input<string>('Selecciona una opción');
  readonly helpText    = input<string>('');
  readonly options     = input<SelectOption[]>([]);
  readonly icon        = input<string | undefined>(undefined);
  readonly size        = input<'md' | 'sm'>('md');
  /**
   * Permite escribir un valor que no está en la lista (p. ej. una categoría nueva): el buscador
   * se muestra siempre y ofrece «Crear "…"» cuando el texto no coincide con ninguna opción.
   */
  readonly creatable   = input<boolean>(false);
  readonly createLabel = input<string>('Crear');
  /** Alto máximo (px) de la lista antes de hacer scroll. */
  readonly maxHeight   = input<number>(280);

  readonly touch = output<void>();

  protected readonly open      = signal(false);
  protected readonly search    = signal('');
  protected readonly activeIdx = signal(-1);
  protected readonly placement = signal<'down' | 'up'>('down');
  protected readonly panelBox  = signal<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  private readonly formDisabled = signal(false);

  protected readonly isDisabled = computed(() => this.disabled() || this.formDisabled());

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  private readonly trigger     = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly panel       = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly host        = viewChild<ElementRef<HTMLElement>>('rootEl');

  private readonly uid = `lib-select-${++nextId}`;
  protected readonly selectId = computed(() => this.inputId() || this.uid);
  protected readonly listId   = `${this.uid}-list`;
  protected optionId(i: number): string { return `${this.uid}-opt-${i}`; }

  protected readonly showSearch = computed(() => this.creatable() || this.options().length > SEARCH_THRESHOLD);

  /** Opciones visibles; en modo creatable incluye al final la de crear lo escrito. */
  protected readonly filteredOptions = computed<SelectOption[]>(() => {
    const raw = this.search().trim();
    const q = this.normalize(raw);
    const list = q ? this.options().filter(o => this.normalize(o.label).includes(q)) : this.options();
    if (this.creatable() && raw && !this.options().some(o => this.normalize(o.label) === q)) {
      return [...list, { value: raw, label: raw, hint: CREATE_HINT }];
    }
    return list;
  });

  protected readonly createHint = CREATE_HINT;

  /** La opción elegida; en modo creatable, un valor escrito que aún no está en la lista. */
  protected readonly selectedOption = computed<SelectOption | null>(() => {
    const v = String(this.value() ?? '');
    return this.options().find(o => o.value === v) ?? (this.creatable() && v ? { value: v, label: v } : null);
  });

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};
  private typeahead = '';
  private typeaheadTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    // Al abrir: enfoca el buscador (si aplica) y deja visible la opción activa.
    effect(() => {
      if (!this.open()) return;
      const input = this.searchInput()?.nativeElement;
      queueMicrotask(() => {
        input?.focus();
        this.scrollActiveIntoView();
      });
    });
  }

  // ── ControlValueAccessor ────────────────────────────────────────────────────
  writeValue(value: unknown): void { this.value.set(value == null ? '' : String(value)); }
  registerOnChange(fn: (value: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.formDisabled.set(disabled); }

  // ── Apertura y posición ─────────────────────────────────────────────────────
  protected toggle(): void {
    if (this.isDisabled()) return;
    this.open() ? this.close() : this.openPanel();
  }

  protected openPanel(): void {
    if (this.isDisabled() || this.open()) return;
    this.search.set('');
    const selected = this.filteredOptions().findIndex(o => o.value === String(this.value() ?? ''));
    this.activeIdx.set(selected >= 0 ? selected : this.firstEnabled(0, 1));
    this.position();
    this.open.set(true);
  }

  protected close(refocus = false): void {
    if (!this.open()) return;
    this.open.set(false);
    this.onTouched();
    this.touch.emit();
    if (refocus) this.trigger()?.nativeElement.focus();
  }

  private position(): void {
    const el = this.trigger()?.nativeElement;
    if (!el || typeof window === 'undefined') return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - GAP - VIEWPORT_MARGIN;
    const above = r.top - GAP - VIEWPORT_MARGIN;
    const wanted = this.maxHeight() + (this.showSearch() ? 44 : 0) + 10;
    const up = below < Math.min(wanted, 200) && above > below;
    const room = up ? above : below;
    this.placement.set(up ? 'up' : 'down');
    this.panelBox.set({
      top: up ? r.top - GAP : r.bottom + GAP,
      left: Math.max(VIEWPORT_MARGIN, Math.min(r.left, window.innerWidth - r.width - VIEWPORT_MARGIN)),
      width: r.width,
      maxHeight: Math.max(120, Math.min(wanted, room)),
    });
  }

  @HostListener('window:resize')
  @HostListener('window:scroll', ['$event'])
  onViewportChange(event?: Event): void {
    if (!this.open()) return;
    // El scroll dentro de la propia lista no mueve el panel.
    if (event && this.panel()?.nativeElement.contains(event.target as Node)) return;
    this.position();
  }

  // ── Selección ───────────────────────────────────────────────────────────────
  protected selectOption(opt: SelectOption): void {
    if (opt.disabled) return;
    if (opt.value !== String(this.value() ?? '')) {
      this.value.set(opt.value);
      this.onChange(opt.value);
    }
    this.close(true);
  }

  // ── Teclado ─────────────────────────────────────────────────────────────────
  protected onTriggerKeydown(event: KeyboardEvent): void {
    if (this.isDisabled()) return;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        if (!this.open()) { this.openPanel(); return; }
        this.move(event.key === 'ArrowDown' ? 1 : -1);
        return;
      case 'Home':
      case 'End':
        if (!this.open()) return;
        event.preventDefault();
        this.activeIdx.set(event.key === 'Home' ? this.firstEnabled(0, 1) : this.firstEnabled(this.filteredOptions().length - 1, -1));
        this.scrollActiveIntoView();
        return;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!this.open()) { this.openPanel(); return; }
        this.commitActive();
        return;
      case 'Escape':
        if (this.open()) { event.preventDefault(); event.stopPropagation(); this.close(true); }
        return;
      case 'Tab':
        if (this.open()) this.close();
        return;
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) this.typeAhead(event.key);
    }
  }

  protected onSearchKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown': event.preventDefault(); this.move(1); return;
      case 'ArrowUp': event.preventDefault(); this.move(-1); return;
      case 'Enter': event.preventDefault(); this.commitActive(); return;
      case 'Escape': event.preventDefault(); event.stopPropagation(); this.close(true); return;
      case 'Tab': this.close(); return;
    }
  }

  protected onSearchInput(value: string): void {
    this.search.set(value);
    this.activeIdx.set(this.firstEnabled(0, 1));
  }

  private move(step: 1 | -1): void {
    const list = this.filteredOptions();
    if (!list.length) return;
    let i = this.activeIdx();
    for (let n = 0; n < list.length; n++) {
      i = (i + step + list.length) % list.length;
      if (!list[i].disabled) break;
    }
    this.activeIdx.set(i);
    this.scrollActiveIntoView();
  }

  private commitActive(): void {
    const opt = this.filteredOptions()[this.activeIdx()];
    if (opt) this.selectOption(opt); else this.close(true);
  }

  /** Escribir letras con la lista cerrada o abierta salta a la primera opción que empieza así. */
  private typeAhead(char: string): void {
    clearTimeout(this.typeaheadTimer);
    this.typeahead += this.normalize(char);
    this.typeaheadTimer = setTimeout(() => (this.typeahead = ''), 600);
    const list = this.filteredOptions();
    const i = list.findIndex(o => !o.disabled && this.normalize(o.label).startsWith(this.typeahead));
    if (i < 0) return;
    if (this.open()) { this.activeIdx.set(i); this.scrollActiveIntoView(); }
    else this.selectOption(list[i]);
  }

  private firstEnabled(from: number, step: 1 | -1): number {
    const list = this.filteredOptions();
    for (let i = from; i >= 0 && i < list.length; i += step) if (!list[i].disabled) return i;
    return -1;
  }

  private scrollActiveIntoView(): void {
    const i = this.activeIdx();
    if (i < 0 || typeof document === 'undefined') return;
    document.getElementById(this.optionId(i))?.scrollIntoView({ block: 'nearest' });
  }

  private normalize(text: string): string {
    return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentPointer(event: MouseEvent): void {
    if (!this.open()) return;
    const target = event.target as Node;
    if (this.host()?.nativeElement.contains(target) || this.panel()?.nativeElement.contains(target)) return;
    this.close();
  }
}
