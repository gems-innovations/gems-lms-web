import { ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, inject, input, output, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ITapTopic } from './taps.types';

/**
 * Barra superior del feed de Taps: marca GEMS LMS (lleva a la portada), sonido, voz del personaje y selector de temas.
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
          @if (sound() === 'pending') { <span class="bar__tip">{{ desktop() ? 'Clic o M para sonido' : 'Toca para sonido' }}</span> }
        }
      </button>
      <!-- «Voz»: el personaje lee la pregunta (apagada por defecto). Su lugar está reservado desde el primer pintado (sin saltos
           al hidratar); mientras no se sabe si hay voz, o si el dispositivo no tiene, el botón ocupa espacio pero no se ve ni se enfoca. -->
      @let v = voice();
      <button type="button" class="glass bar__pill bar__voice" [class.is-reserved]="v !== 'on' && v !== 'off'" (click)="toggleVoice.emit()"
              [attr.aria-pressed]="v === 'on'" [attr.aria-hidden]="v !== 'on' && v !== 'off' ? 'true' : null"
              [attr.tabindex]="v !== 'on' && v !== 'off' ? -1 : null" aria-label="Voz del personaje" aria-describedby="taps-voz-nota">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M4 5h16v10H10l-5 4v-4H4Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>
            @if (v === 'on') { <path d="M8 10h.01M12 8v4M16 9v2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/> }
            @else { <path d="M3 3l18 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/> }
          </svg>
      </button>
      <span id="taps-voz-nota" class="visually-hidden">Lee las preguntas en voz alta. Si usas lector de pantalla, puedes dejarla apagada.</span>
      <button type="button" class="glass bar__pill bar__topics" (click)="open()" aria-haspopup="dialog" [attr.aria-label]="'Temas: ' + topicName()">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/></svg>
        <span>{{ topicName() }}</span>
      </button>
      @if (topic()) {
        <button type="button" class="bar__pill bar__chip" (click)="topicChange.emit(null)" [attr.aria-label]="'Quitar el filtro de ' + topicName()">
          <span>{{ topicName() }}</span>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>
        </button>
      }
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
    /* Con el botón de voz no caben marca, sonido, voz y temas en 320 px: el nombre de la marca se oculta (queda el logo). */
    .bar__voice.is-reserved { visibility: hidden; pointer-events: none; }
    @media (max-width: 359px) { .bar__brand span { display: none; } }
    .visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
    /* Aviso «Toca para sonido» bajo el botón (fuera del flujo: la barra cabe en 320 px) y bajo la barra de progreso. */
    .bar__tip { position: absolute; top: calc(100% + 16px); left: 0; padding: 4px 10px; border-radius: 999px; font-size: 13px; white-space: nowrap;
      background: rgba(8, 10, 14, .72); border: 1px solid rgba(255, 255, 255, .18); pointer-events: none; }
    .bar__brand, .bar__pill { white-space: nowrap; flex: none; }
    .bar__topics { margin-left: auto; padding: 0 12px 0 10px; }
    .bar__chip { display: none; margin-left: auto; color: #0d1117; background: #4de1ff; border: 0; }
    /* Escritorio y tablet: la barra vive dentro del escenario; la marca y «Temas» están en el menú. */
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
    @container taps (min-width: 768px) {
      .bar { position: absolute; left: 0; right: 0; width: auto; max-width: none; transform: none; padding-top: 10px; }
      .bar__brand, .bar__topics { display: none; }
      .bar__chip { display: inline-flex; }
      .sheet { width: min(660px, 100%); max-width: none; height: 100dvh; max-height: none; margin: 0 auto 0 0; border-radius: 0 22px 22px 0;
        &[open] { animation: drawer-in .26s var(--curva-estandar, ease); } }
      .sheet__list { grid-template-columns: repeat(2, 1fr); }
    }
    a:focus-visible, button:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
    @keyframes sheet-in { from { transform: translateY(100%); } }
    @keyframes drawer-in { from { transform: translateX(-100%); } }
    @media (prefers-reduced-motion: reduce) { .sheet[open] { animation: none; } }
  `,
})
export class TapsBarComponent {
  private readonly injector = inject(Injector);
  readonly sound = input<'pending' | 'on' | 'off'>('pending');
  /** Voz del personaje; `null` = aún no se sabe y `'none'` = sin voz utilizable (el botón reserva su lugar pero no se ve). */
  readonly voice = input<'on' | 'off' | 'none' | null>(null);
  readonly topic = input<string | null>(null);
  readonly topicName = input('Para ti');
  readonly desktop = input(false);
  readonly topics = input<{ topic: ITapTopic; count: number; soon: boolean }[]>([]);

  readonly toggleSound = output<void>();
  readonly toggleVoice = output<void>();
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
