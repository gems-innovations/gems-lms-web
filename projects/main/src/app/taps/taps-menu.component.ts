import { ChangeDetectionStrategy, Component, ElementRef, HostListener, input, output, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Un tema de «Tus temas»: anillo con los Taps completados de su categoría. */
export interface IMenuTopic { id: string; name: string; color: string; done: number; total: number }

/**
 * Menú de escritorio y tablet (escritorio.md §3). Solo destinos que existen hoy: nada de «Ranking», «Reto del día» ni
 * «Mi institución», que dependen del servidor. ≥ 1280 px: lateral ancho (se contrae con `[`). 1024–1279: lateral de iconos
 * que `[` abre encima del contenido. 768–1023: barra superior de 64 px con pestañas y un menú. En móvil no se ve.
 */
@Component({
  selector: 'gems-taps-menu',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="side" [class.is-inv]="inverted()" aria-label="Menú de Taps">
      <a class="side__brand" routerLink="/" aria-label="GEMS LMS: ir a la portada">
        <img src="/logo-64.png" width="32" height="32" alt="" decoding="async">
        <span class="side__txt">GEMS LMS<small>Taps</small></span>
      </a>
      <button type="button" class="side__toggle" (click)="toggleMenu.emit()" aria-label="Contraer o ampliar el menú" aria-keyshortcuts="[">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
      </button>

      <p class="side__group">Jugar</p>
      <ul class="side__list">
        <li><button type="button" class="side__item" [class.is-on]="!topic()" (click)="forYou.emit()" [attr.aria-pressed]="!topic()" title="Para ti">
          <span class="chip"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/></svg></span>
          <span class="side__txt">Para ti</span></button></li>
        <li><button type="button" class="side__item" (click)="openTopics.emit()" title="Temas" aria-haspopup="dialog" aria-keyshortcuts="T">
          <span class="chip"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg></span>
          <span class="side__txt">Temas</span></button></li>
        <li><a class="side__item" routerLink="/retos" title="Retos de lógica">
          <span class="chip"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          <span class="side__txt">Retos de lógica</span></a></li>
        <li><a class="side__item" routerLink="/bloques" title="Quiz de Bloques">
          <span class="chip"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 3 20 7.5v9L12 21l-8-4.5v-9L12 3Zm0 9 8-4.5M12 12 4 7.5M12 12v9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg></span>
          <span class="side__txt">Quiz de Bloques</span></a></li>
      </ul>

      <p class="side__group">Aprender</p>
      <ul class="side__list">
        <li><a class="side__item" routerLink="/" title="Cursos gratis">
          <span class="chip"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16ZM4 19.5A2.5 2.5 0 0 1 6.5 17H20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg></span>
          <span class="side__txt">Cursos gratis</span></a></li>
        <li><a class="side__item" routerLink="/instituciones" title="Para instituciones">
          <span class="chip"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M3 10 12 4l9 6M5 10v8m4-8v8m6-8v8m4-8v8M3 20h18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          <span class="side__txt">Para instituciones</span></a></li>
      </ul>

      <p class="side__group">Tus temas</p>
      @if (temas().length) {
        <ul class="side__list">
          @for (t of temas(); track t.id) {
            <li><button type="button" class="side__item side__topic" [class.is-on]="topic() === t.id" (click)="pickTopic.emit(t.id)" [attr.aria-pressed]="topic() === t.id" [title]="t.name + ': ' + t.done + ' de ' + t.total">
              <svg class="side__ring" viewBox="0 0 36 36" width="34" height="34" aria-hidden="true">
                <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="4"/>
                <circle cx="18" cy="18" r="15" fill="none" [attr.stroke]="t.color" stroke-width="4" stroke-linecap="round" pathLength="100" [attr.stroke-dasharray]="(t.total ? t.done / t.total * 100 : 0) + ' 100'" transform="rotate(-90 18 18)"/>
              </svg>
              <span class="side__txt">{{ t.name }}<small>{{ t.done }} de {{ t.total }}</small></span>
              @if (topic() === t.id) { <span class="side__x" aria-hidden="true">×</span> }
            </button></li>
          }
        </ul>
        <p class="side__note side__txt">Solo en este navegador.</p>
      } @else {
        <p class="side__note side__txt">Aquí verás tus temas cuando completes tu primer Tap.</p>
      }

      <div class="side__foot">
        <p class="side__who side__txt">Juegas como invitado. Tu avance vive en este navegador.</p>
        <a class="side__login side__txt" routerLink="/auth/signin">Entrar</a>
        <button type="button" class="side__keys" (click)="toggleShortcuts.emit()" [attr.aria-pressed]="shortcuts()" title="Atajos de teclado">
          <span class="chip"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M7 10h.01M11 10h.01M15 10h.01M8 14h8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></span>
          <span class="side__txt">Atajos: {{ shortcuts() ? 'activados' : 'apagados' }}</span>
        </button>
        <p class="side__legal side__txt"><a routerLink="/terminos">Términos</a> · <a routerLink="/privacidad">Privacidad</a></p>
      </div>
    </nav>

    <nav class="top" aria-label="Barra de Taps">
      <a class="top__brand" routerLink="/" aria-label="GEMS LMS: ir a la portada">
        <img src="/logo-64.png" width="30" height="30" alt="" decoding="async"><span>GEMS LMS</span>
      </a>
      <div class="top__tabs" role="group" aria-label="Taps">
        <button type="button" class="top__tab" [class.is-on]="!topic()" [attr.aria-pressed]="!topic()" (click)="forYou.emit()">Para ti</button>
        <button type="button" class="top__tab" (click)="openTopics.emit()" aria-haspopup="dialog">Temas</button>
      </div>
      <button type="button" class="top__menu" (click)="moreOpen.set(!moreOpen())" #moreBtn [attr.aria-expanded]="moreOpen()" aria-controls="top-mas" aria-label="Menú">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
      </button>
      @if (moreOpen()) {
        <div class="top__pop" id="top-mas">
          <a routerLink="/retos">Retos de lógica</a>
          <a routerLink="/bloques">Quiz de Bloques</a>
          <a routerLink="/">Cursos gratis</a>
          <a routerLink="/instituciones">Para instituciones</a>
          <button type="button" (click)="toggleShortcuts.emit(); moreOpen.set(false)">Atajos de teclado: {{ shortcuts() ? 'apagar' : 'encender' }}</button>
          <a routerLink="/auth/signin">Entrar</a>
        </div>
      }
    </nav>
  `,
  styleUrl: './taps-menu.component.scss',
})
export class TapsMenuComponent {
  readonly topic = input<string | null>(null);
  readonly temas = input<IMenuTopic[]>([]);
  /** El menú está en el estado contrario al de su ancho (contraído en ≥ 1280, abierto en 1024–1279). */
  readonly inverted = input(false);
  readonly shortcuts = input(true);

  readonly forYou = output<void>();
  readonly openTopics = output<void>();
  readonly pickTopic = output<string>();
  readonly toggleMenu = output<void>();
  readonly toggleShortcuts = output<void>();

  protected readonly moreOpen = signal(false);

  private readonly moreBtn = viewChild<ElementRef<HTMLButtonElement>>('moreBtn');
  /** Esc cierra el menú de la barra superior y devuelve el foco a su botón. */
  @HostListener('document:keydown.escape') protected onEscape(): void {
    if (!this.moreOpen()) return;
    this.moreOpen.set(false);
    this.moreBtn()?.nativeElement.focus();
  }
}
