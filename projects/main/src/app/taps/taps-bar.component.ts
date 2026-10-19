import { ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, inject, input, output, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ITapTopic } from './taps.types';

/**
 * Barra superior del feed de Taps: marca GEMS LMS (lleva a la portada), sonido y selector de temas.
 * El selector es una hoja inferior (nunca un modal centrado, experiencia-ux.md §8.5) con «Para ti» y las categorías;
 * las que aún no tienen Taps se ven como «Pronto». Al elegir, el feed salta a esos Taps y la URL queda `?tema=<id>`.
 */
@Component({
  selector: 'gems-taps-bar',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="bar">
      <a class="bar__brand" routerLink="/" aria-label="GEMS LMS: ir a la portada">
        <img src="/logo-64.png" width="28" height="28" alt="" decoding="async">
        <span>GEMS LMS</span>
      </a>
      <button type="button" class="glass bar__pill bar__sound" (click)="toggleSound.emit()" [attr.aria-pressed]="sound() === 'on'"
              aria-label="Sonido">
        @if (sound() === 'on') {
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5Z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
        } @else {
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5Z" fill="currentColor"/><path d="m22 9-6 6M16 9l6 6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
          @if (sound() === 'pending') { <span class="bar__tip">Toca para sonido</span> }
        }
      </button>
      <button type="button" class="glass bar__pill bar__topics" (click)="open()" aria-haspopup="dialog" [attr.aria-label]="'Temas: ' + topicName()">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/></svg>
        <span>{{ topicName() }}</span>
      </button>
    </header>

    @if (isOpen()) {
      <dialog class="sheet" #sheet (close)="close()" (click)="$event.target === sheet && close()" aria-labelledby="taps-sheet-title">
        <div class="sheet__body">
          <h2 id="taps-sheet-title" class="sheet__title">Elige un tema</h2>
          <ul class="sheet__list">
            <li>
              <button type="button" class="glass sheet__item" [class.is-on]="!topic()" (click)="pick(null)">
                <span class="sheet__dot" style="--c: #ffffff"></span>
                <span class="sheet__name">Para ti<small>Un poco de todo</small></span>
              </button>
            </li>
            @for (t of topics(); track t.topic.id) {
              <li>
                <button type="button" class="glass sheet__item" [class.is-on]="topic() === t.topic.id" [disabled]="t.soon" (click)="pick(t.topic.id)">
                  <span class="sheet__dot" [style.--c]="t.topic.color"></span>
                  <span class="sheet__name">{{ t.topic.name }}<small>{{ t.topic.blurb }}</small></span>
                  <span class="sheet__count">{{ t.soon ? 'Pronto' : t.count + (t.count === 1 ? ' Tap' : ' Taps') }}</span>
                </button>
              </li>
            }
          </ul>
          <button type="button" class="glass sheet__close" (click)="close()">Cerrar</button>
        </div>
      </dialog>
    }
  `,
  styles: `
    :host { --safe-b: max(12px, calc(env(safe-area-inset-bottom) + 8px)); font-family: var(--font-texto, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif); }
    .bar { position: fixed; z-index: 7; top: 0; left: 50%; width: 100%; max-width: 480px; transform: translateX(-50%); display: flex; align-items: center; gap: 6px;
      padding: max(8px, env(safe-area-inset-top)) 10px 4px; pointer-events: none; color: #fff;
      > * { pointer-events: auto; } }
    .bar__brand { display: inline-flex; align-items: center; gap: 6px; min-height: 48px; padding-right: 4px; color: #fff; text-decoration: none; font-size: 13px; font-weight: 800;
      letter-spacing: .02em; text-shadow: 0 1px 2px rgba(0, 0, 0, .6);
      img { border-radius: 8px; filter: drop-shadow(0 1px 2px rgba(0, 0, 0, .4)); } }
    .bar__pill { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-width: 48px; min-height: 48px; padding: 0 12px; border-radius: 999px;
      font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
    .bar__sound { position: relative; }
    /* Aviso «Toca para sonido» bajo el botón (fuera del flujo: la barra cabe en 320 px) y bajo la barra de progreso. */
    .bar__tip { position: absolute; top: calc(100% + 16px); left: 0; padding: 4px 10px; border-radius: 999px; font-size: 13px; white-space: nowrap;
      background: rgba(8, 10, 14, .72); border: 1px solid rgba(255, 255, 255, .18); pointer-events: none; }
    .bar__brand, .bar__pill { white-space: nowrap; flex: none; }
    .bar__topics { margin-left: auto; padding: 0 12px 0 10px; }
    .sheet { width: 100%; max-width: 480px; margin: auto auto 0; padding: 0; border: 0; border-radius: 22px 22px 0 0; color: #fff; background: #161b24;
      &::backdrop { background: rgba(0, 0, 0, .55); }
      &[open] { animation: sheet-in .26s cubic-bezier(.2, 1.1, .4, 1); } }
    .sheet__body { padding: 16px 16px var(--safe-b); }
    .sheet__title { margin: 0 0 10px; font-size: 18px; }
    .sheet__list { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
    .sheet__item { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 58px; padding: 8px 14px; border-radius: 14px; font: inherit; text-align: left; cursor: pointer;
      &:disabled { cursor: default; opacity: .55; } }
    .sheet__item.is-on { color: #fff; small, .sheet__count { color: #fff; } }
    .sheet__dot { flex: none; width: 14px; height: 14px; border-radius: 4px; background: var(--c); }
    .sheet__name { flex: 1; font-size: 16px; font-weight: 800; small { display: block; font-size: 12px; font-weight: 700; color: #aab4c4; } }
    .sheet__count { font-size: 12px; font-weight: 700; color: #c8d1de; }
    .sheet__close { width: 100%; min-height: 48px; margin-top: 12px; border-radius: 14px; font: inherit; font-weight: 700; cursor: pointer; }
    a:focus-visible, button:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
    @keyframes sheet-in { from { transform: translateY(100%); } }
    @media (prefers-reduced-motion: reduce) { .sheet[open] { animation: none; } }
  `,
})
export class TapsBarComponent {
  private readonly injector = inject(Injector);
  readonly sound = input<'pending' | 'on' | 'off'>('pending');
  readonly topic = input<string | null>(null);
  readonly topicName = input('Para ti');
  readonly topics = input<{ topic: ITapTopic; count: number; soon: boolean }[]>([]);

  readonly toggleSound = output<void>();
  readonly topicChange = output<string | null>();
  /** Abierta o cerrada: el feed pausa la cuenta atrás mientras se elige. */
  readonly sheetChange = output<boolean>();

  protected readonly isOpen = signal(false);
  private readonly sheet = viewChild<ElementRef<HTMLDialogElement>>('sheet');

  open(): void {
    if (this.isOpen()) return;
    this.isOpen.set(true);
    this.sheetChange.emit(true);
    afterNextRender(() => { const d = this.sheet()?.nativeElement; if (d && !d.open) d.showModal?.(); }, { injector: this.injector });
  }

  protected close(): void {
    if (!this.isOpen()) return;
    this.sheet()?.nativeElement.close?.();
    this.isOpen.set(false);
    this.sheetChange.emit(false);
  }

  protected pick(id: string | null): void {
    this.close();
    this.topicChange.emit(id);
  }
}
