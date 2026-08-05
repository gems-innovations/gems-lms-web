import {
  Component, input, output, signal, computed,
  forwardRef, ChangeDetectionStrategy, ElementRef, viewChild
} from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { MarkdownComponent } from 'ngx-markdown';

type TEditorTab = 'edit' | 'preview';

@Component({
  selector: 'lib-markdown-editor',
  standalone: true,
  imports: [MarkdownComponent],
  templateUrl: './markdown-editor.html',
  styleUrl: './markdown-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MarkdownEditorComponent),
      multi: true
    }
  ]
})
export class MarkdownEditorComponent implements ControlValueAccessor {
  readonly placeholder = input<string>('Escribe aquí en **Markdown**…');
  readonly rows        = input<number>(14);
  readonly label       = input<string | null>(null);

  readonly valueChange = output<string>();

  protected readonly tab     = signal<TEditorTab>('edit');
  protected readonly content = signal<string>('');
  protected readonly focused = signal<boolean>(false);

  private _onChange: (v: string) => void = () => {};
  private _onTouched: () => void = () => {};

  private textareaRef = viewChild<ElementRef<HTMLTextAreaElement>>('textarea');

  protected readonly charCount = computed(() => this.content().length);

  protected setTab(t: TEditorTab): void { this.tab.set(t); }

  protected onInput(event: Event): void {
    const val = (event.target as HTMLTextAreaElement).value;
    this.content.set(val);
    this._onChange(val);
    this.valueChange.emit(val);
  }

  protected onFocus(): void { this.focused.set(true); }
  protected onBlur(): void  { this.focused.set(false); this._onTouched(); }

  protected insertSyntax(prefix: string, suffix = '', placeholder = 'texto'): void {
    const ta = this.textareaRef()?.nativeElement;
    if (!ta) return;
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    const sel   = ta.value.substring(start, end) || placeholder;
    const replacement = prefix + sel + suffix;
    const newVal = ta.value.substring(0, start) + replacement + ta.value.substring(end);
    ta.value = newVal;
    ta.selectionStart = start + prefix.length;
    ta.selectionEnd   = start + prefix.length + sel.length;
    ta.focus();
    this.content.set(newVal);
    this._onChange(newVal);
    this.valueChange.emit(newVal);
  }

  protected insertAtLineStart(prefix: string): void {
    const ta = this.textareaRef()?.nativeElement;
    if (!ta) return;
    const start = ta.selectionStart;
    const lineStart = ta.value.lastIndexOf('\n', start - 1) + 1;
    const alreadyHas = ta.value.substring(lineStart).startsWith(prefix);
    const newVal = alreadyHas
      ? ta.value.substring(0, lineStart) + ta.value.substring(lineStart + prefix.length)
      : ta.value.substring(0, lineStart) + prefix + ta.value.substring(lineStart);
    ta.value = newVal;
    ta.selectionStart = ta.selectionEnd = alreadyHas ? start - prefix.length : start + prefix.length;
    ta.focus();
    this.content.set(newVal);
    this._onChange(newVal);
    this.valueChange.emit(newVal);
  }

  protected insertCodeBlock(): void {
    const ta = this.textareaRef()?.nativeElement;
    if (!ta) return;
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    const sel   = ta.value.substring(start, end);
    const block = sel
      ? '```\n' + sel + '\n```'
      : '```\ncódigo aquí\n```';
    const newVal = ta.value.substring(0, start) + block + ta.value.substring(end);
    ta.value = newVal;
    ta.focus();
    this.content.set(newVal);
    this._onChange(newVal);
    this.valueChange.emit(newVal);
  }

  writeValue(val: string): void { this.content.set(val ?? ''); }
  registerOnChange(fn: (v: string) => void): void { this._onChange = fn; }
  registerOnTouched(fn: () => void): void { this._onTouched = fn; }
}
