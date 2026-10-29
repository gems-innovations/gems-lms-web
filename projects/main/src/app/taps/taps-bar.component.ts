import { ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, inject, input, output, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TapSesionComponent } from './tap-sesion.component';
import { IResumenSesion, sessionLabel } from './taps.sesion';
import { ITapTopic } from './taps.types';

/**
 * Barra superior del feed de Taps: marca GEMS LMS, sonido (silencio general), ranking y selector de temas.
 * La marca no saca del juego (hallazgo 5 de la auditoría de permanencia): abre «Tu día en Taps» (racha, meta y avance), desde
 * donde la portada queda a un toque. Cuando ya hay progreso, el nombre de la marca cede su sitio a la racha y la meta del día.
 * El selector es una hoja inferior (nunca un modal centrado, experiencia-ux.md §8.5) con «Para ti» y las categorías;
 * las que aún no tienen Taps se ven como «Pronto». Al elegir, el feed salta a esos Taps y la URL queda `?tema=<id>`.
 */
@Component({
  selector: 'gems-taps-bar',
  imports: [RouterLink, TapSesionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="bar">
      <button type="button" class="bar__brand" (click)="brand.emit()" aria-haspopup="dialog"
              [attr.aria-label]="'Tu día en Taps. ' + (resumen() ? label(resumen()!) : 'GEMS LMS')">
        <img src="/logo-64.png" width="28" height="28" alt="" decoding="async">
        @if (resumen(); as r) { <gems-tap-sesion [resumen]="r" /> } @else { <span>GEMS LMS</span> }
      </button>
      <!-- Silencio general: un solo botón calla o devuelve TODO (efectos, música y voz). Nombre fijo y el estado en aria-pressed;
           el title (escritorio) dice qué pasará. Música y voz, por separado, en «Tu día» (celular) o el menú (escritorio). -->
      <!-- Antes de hidratar (sound null) no se sabe lo guardado: altavoz neutro, sin ondas ni tachado y sin aria-pressed, para
           que quien lo dejó apagado no vea un altavoz encendido que luego salta. -->
      <button type="button" class="glass bar__pill bar__sound" (click)="toggleSound.emit($event.timeStamp)"
              [attr.aria-pressed]="sound() === null ? null : sound() === 'on'"
              aria-label="Sonido" [attr.aria-keyshortcuts]="desktop() ? 'M' : null"
              [attr.title]="desktop() && sound() !== null ? (sound() === 'on' ? 'Silenciar todo (M)' : 'Activar el sonido (M)') : null">
        @if (sound() === null) {
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5Z" fill="currentColor"/></svg>
        } @else if (sound() === 'on') {
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5Z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
        } @else {
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5Z" fill="currentColor"/><path d="m22 9-6 6M16 9l6 6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
        }
      </button>
      <button type="button" class="glass bar__pill bar__rank" (click)="openRanking.emit()" aria-haspopup="dialog" aria-label="Ranking">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M7 4h10v5a5 5 0 0 1-10 0V4ZM7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v3.5M8.5 20.5h7M9.5 17.5h5" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <a class="glass bar__pill bar__explorar" routerLink="/taps/explorar" aria-label="Explorar: buscar Taps">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="m15.5 15.5 5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
      </a>
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
              <a class="glass sheet__item sheet__explorar" routerLink="/taps/explorar">
                <svg class="sheet__lupa" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="m15.5 15.5 5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
                <span class="sheet__name">Explorar<small>Busca, mira lo más visto y lo nuevo</small></span>
              </a>
            </li>
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
                  <span class="sheet__name">{{ t.topic.name }}<small>{{ t.topic.blurb }}</small>
                    @if (!t.soon && insignias()[t.topic.id]; as i) { <small class="sheet__ins">Colecciones: {{ i.ganadas }} de {{ i.total }} insignias</small> }
                  </span>
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
    .bar__brand { display: inline-flex; align-items: center; gap: 6px; min-height: 48px; padding: 0 4px 0 0; border: 0; background: none; cursor: pointer; font-family: inherit;
      color: #fff; text-decoration: none; font-size: 13px; font-weight: 800;
      letter-spacing: .02em; text-shadow: 0 1px 2px rgba(0, 0, 0, .6);
      img { border-radius: 8px; filter: drop-shadow(0 1px 2px rgba(0, 0, 0, .4)); } }
    .bar__pill { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-width: 48px; min-height: 48px; padding: 0 12px; border-radius: 999px;
      font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
    /* Por debajo de 400 px (375 incluido) no caben marca, racha, sonido, trofeo y temas con texto: el nombre de la marca se
       oculta y queda el logo, para que «Temas» no se recorte. */
    @media (max-width: 399px) { .bar__brand span { display: none; } }
    .bar__brand, .bar__pill { white-space: nowrap; flex: none; }
    .bar__rank, .bar__explorar { padding: 0; color: #fff; text-decoration: none; }
    /* Con logo, sonido y ranking, «Temas» es lo único que cede: un tema largo («Lógica y trampas») se recorta con «…». */
    .bar__topics { flex: 0 1 auto; min-width: 48px; margin-left: auto; padding: 0 12px 0 10px; overflow: hidden;
      svg { flex: none; } span { min-width: 0; overflow: hidden; text-overflow: ellipsis; } }
    /* Por debajo de 400 px «Temas» queda solo con su icono (y su etiqueta accesible): así caben logo (28 px, siempre), racha,
       sonido y ranking. Va siempre, con o sin racha, para que nada salte al hidratar. Fuera de la portada (#45). */
    @media (max-width: 399px) { :host-context(gems-taps:not([modo='portada'])) .bar__topics span { display: none; } }
    .bar__chip { display: none; margin-left: auto; color: #0d1117; background: #4de1ff; border: 0; }
    /* Escritorio y tablet: la barra vive dentro del escenario; la marca y «Temas» están en el menú. */
    .sheet { width: 100%; max-width: 480px; margin: auto auto 0; padding: 0; border: 0; border-radius: 22px 22px 0 0; color: #fff; background: #161b24;
      &::backdrop { background: rgba(0, 0, 0, .55); }
      &[open] { animation: sheet-in .26s cubic-bezier(.2, 1.1, .4, 1); } }
    .sheet__body { padding: 16px 16px var(--safe-b); }
    .sheet__title { margin: 0 0 10px; font-size: 18px; }
    .sheet__list { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
    .sheet__item { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 58px; padding: 8px 14px; border-radius: 14px; font: inherit; text-align: left; text-decoration: none; cursor: pointer;
      &:disabled { cursor: default; opacity: .55; } }
    .sheet__item.is-on { color: #fff; small, .sheet__count { color: #fff; } }
    .sheet__lupa { flex: none; }
    .sheet__dot { flex: none; width: 14px; height: 14px; border-radius: 4px; background: var(--c); }
    .sheet__name { flex: 1; font-size: 16px; font-weight: 800; small { display: block; font-size: 12px; font-weight: 700; color: #aab4c4; } }
    .sheet__count { font-size: 12px; font-weight: 700; color: #c8d1de; }
    .sheet__name small.sheet__ins { margin-top: 2px; color: #f2c94c; }
    .sheet__close { width: 100%; min-height: 48px; margin-top: 12px; border-radius: 14px; font: inherit; font-weight: 700; cursor: pointer; }
    @container taps (min-width: 768px) {
      .bar { position: absolute; left: 0; right: 0; width: auto; max-width: none; transform: none; padding-top: 10px; }
      .bar__brand, .bar__topics, .bar__rank, .bar__explorar { display: none; }
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
  /** Sonido general (efectos, música y voz): encendido por defecto; `null` antes de hidratar (aún no se sabe lo guardado). */
  readonly sound = input<'on' | 'off' | null>(null);
  readonly topic = input<string | null>(null);
  readonly topicName = input('Para ti');
  readonly desktop = input(false);
  readonly topics = input<{ topic: ITapTopic; count: number; soon: boolean }[]>([]);
  /** Racha y meta del día (null: aún no hay progreso y se ve el nombre de la marca). */
  readonly resumen = input<IResumenSesion | null>(null);
  /** Insignias de colección por tema (vacío en el servidor): «Colecciones: 1 de 6 insignias» en la hoja de temas. */
  readonly insignias = input<Record<string, { ganadas: number; total: number }>>({});

  /** Clic en el altavoz, con el instante del evento (un clic de antes de hidratar, repetido al hidratar, nunca enciende). */
  readonly toggleSound = output<number>();
  readonly topicChange = output<string | null>();
  /** Abierta o cerrada: el feed pausa la cuenta atrás mientras se elige. */
  readonly sheetChange = output<boolean>();
  /** Abrir la hoja del ranking (en móvil está aquí; en escritorio, en el menú y el panel). */
  readonly openRanking = output<void>();
  /** Toque en la marca: el feed abre «Tu día en Taps» (no navega). */
  readonly brand = output<void>();
  protected label(r: IResumenSesion): string { return sessionLabel(r); }

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
