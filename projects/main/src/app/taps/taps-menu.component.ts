import { ChangeDetectionStrategy, Component, ElementRef, HostListener, input, output, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IRetoVista } from './taps.reto';

/** Un tema de «Tus temas»: anillo con los Taps completados de su categoría. */
export interface IMenuTopic { id: string; name: string; color: string; done: number; total: number }

/**
 * Menú de escritorio y tablet (escritorio.md §3). Solo destinos que existen hoy: «Ranking» abre la hoja del ranking (con su
 * propio estado «se está preparando» si el API aún no responde); «Explorar» abre /taps/explorar (buscador y catálogo); «Reto del día» lleva al reto de hoy y «Colecciones» abre la
 * hoja «Tu día» en las insignias; «Mi institución» todavía no. ≥ 1280 px: lateral ancho (se contrae con `[`). 1024–1279: lateral de iconos
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
        <li><a class="side__item" routerLink="/taps/explorar" title="Explorar: buscar y ver todos los Taps">
          <span class="chip"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="m15.5 15.5 5 5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></span>
          <span class="side__txt">Explorar</span></a></li>
        <li><button type="button" class="side__item" (click)="openTopics.emit()" title="Temas" aria-haspopup="dialog" aria-keyshortcuts="T">
          <span class="chip"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg></span>
          <span class="side__txt">Temas</span></button></li>
        <li><button type="button" class="side__item" (click)="openRanking.emit()" title="Ranking" aria-haspopup="dialog">
          <span class="chip"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M7 4h10v5a5 5 0 0 1-10 0V4ZM7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v3.5M8.5 20.5h7M9.5 17.5h5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          <span class="side__txt">Ranking</span></button></li>
        @if (reto(); as r) {
          <li><button type="button" class="side__item" (click)="openReto.emit()" [title]="'Reto del día #' + r.numero">
            <span class="chip"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 5h14v15H5zM5 10h14M9 3v4M15 3v4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
            <span class="side__txt">Reto del día #{{ r.numero }}<small>{{ r.hecho ? 'Tu reto: ' + r.hecho.score + ' de ' + r.hecho.total : r.temaNombre }}</small></span></button></li>
        }
        <li><button type="button" class="side__item" (click)="openCols.emit()" title="Colecciones e insignias" aria-haspopup="dialog">
          <span class="chip"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M8 2h3l-1.5 6h-3ZM13 2h3l1.5 6h-3ZM12 22a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg></span>
          <span class="side__txt">Colecciones</span></button></li>
      </ul>

      <p class="side__group">Aprender</p>
      <ul class="side__list">
        <li><a class="side__item" routerLink="/" title="Cursos gratis">
          <span class="chip"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16ZM4 19.5A2.5 2.5 0 0 1 6.5 17H20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg></span>
          <span class="side__txt">Cursos gratis</span></a></li>
        <li><a class="side__item" routerLink="/instituciones" title="Para instituciones">
          <span class="chip"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M3 10 12 4l9 6M5 10v8m4-8v8m6-8v8m4-8v8M3 20h18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          <span class="side__txt">Para instituciones</span></a></li>
        <!-- PR-7 (§A.2): el creador, con el mismo estilo de los demás destinos; ?desde=feed mide la entrada. -->
        <li><a class="side__item" routerLink="/crear" [queryParams]="{ desde: 'feed' }" title="Haz tu personaje" (click)="crear.emit()">
          <span class="chip"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="8" r="3.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M5.5 20.5a6.5 6.5 0 0 1 13 0M16.5 3.5l2 2M19.5 2.5l2 2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          <span class="side__txt">Haz tu personaje</span></a></li>
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
        @if (alias(); as a) {
          <p class="side__who side__txt">Juegas como <strong>{{ a }}</strong>. Al iniciar sesión se guarda tu progreso.</p>
        } @else {
          <p class="side__who side__txt">Juegas como invitado. Tu avance vive en este navegador.</p>
        }
        <a class="side__login side__txt" routerLink="/auth/signin">Entrar</a>
        <button type="button" class="side__keys" (click)="toggleShortcuts.emit()" [attr.aria-pressed]="shortcuts()" title="Atajos de teclado">
          <span class="chip"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M7 10h.01M11 10h.01M15 10h.01M8 14h8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></span>
          <span class="side__txt">Atajos: {{ shortcuts() ? 'activados' : 'apagados' }}</span>
        </button>
        <!-- Música y voz: opciones de detalle (encendida y apagada por defecto). El silencio general es el altavoz del escenario
             (o M). Nombre fijo y el estado en aria-pressed y en el texto. -->
        <button type="button" class="side__keys side__musica" (click)="toggleMusica.emit()" [attr.aria-pressed]="musica()" aria-label="Música de fondo" title="Música de fondo (el altavoz o M silencian todo)">
          <span class="chip"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M9 18V5l11-2v13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6.5" cy="18" r="2.5" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="17.5" cy="16" r="2.5" fill="none" stroke="currentColor" stroke-width="2.2"/></svg></span>
          <span class="side__txt">Música de fondo<small aria-hidden="true">{{ musica() ? 'Encendida' : 'Apagada' }}</small></span>
        </button>
        @if (voz() === 'on' || voz() === 'off') {
          <button type="button" class="side__keys side__musica" (click)="toggleVoz.emit()" [attr.aria-pressed]="voz() === 'on'" aria-label="Voz del personaje" title="Voz del personaje: lee las preguntas en voz alta">
            <span class="chip"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 21v-3.5A7 7 0 1 1 14.6 11.5l1.6 3h-1.7V17a2 2 0 0 1-2 2H10v2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 7.5a4 4 0 0 1 0 5M20.5 5a7.5 7.5 0 0 1 0 10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></span>
            <span class="side__txt">Voz del personaje<small aria-hidden="true">{{ voz() === 'on' ? 'Encendida' : 'Apagada' }}</small></span>
          </button>
        }
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
        <a class="top__tab" routerLink="/taps/explorar">Explorar</a>
      </div>
      <button type="button" class="top__menu" (click)="moreOpen.set(!moreOpen())" #moreBtn [attr.aria-expanded]="moreOpen()" aria-controls="top-mas" aria-label="Menú">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
      </button>
      @if (moreOpen()) {
        <div class="top__pop" id="top-mas">
          <button type="button" (click)="openRanking.emit(); moreOpen.set(false)" aria-haspopup="dialog">Ranking</button>
          <a routerLink="/">Cursos gratis</a>
          <a routerLink="/instituciones">Para instituciones</a>
          <a routerLink="/crear" [queryParams]="{ desde: 'feed' }" (click)="crear.emit(); moreOpen.set(false)">Haz tu personaje</a>
          <button type="button" (click)="toggleShortcuts.emit(); moreOpen.set(false)">Atajos de teclado: {{ shortcuts() ? 'apagar' : 'encender' }}</button>
          <button type="button" class="top__musica" (click)="toggleMusica.emit()" [attr.aria-pressed]="musica()" aria-label="Música de fondo">Música de fondo<span class="top__nota" aria-hidden="true">: {{ musica() ? 'encendida' : 'apagada' }}</span></button>
          @if (voz() === 'on' || voz() === 'off') {
            <button type="button" class="top__musica" (click)="toggleVoz.emit()" [attr.aria-pressed]="voz() === 'on'" aria-label="Voz del personaje">Voz del personaje<span class="top__nota" aria-hidden="true">: {{ voz() === 'on' ? 'encendida' : 'apagada' }}</span></button>
          }
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
  /** Alias del ranking («Creeper Veloz 482»), si el servidor ya asignó uno a este navegador. */
  readonly alias = input<string | null>(null);

  readonly forYou = output<void>();
  readonly openTopics = output<void>();
  readonly pickTopic = output<string>();
  readonly toggleMenu = output<void>();
  readonly toggleShortcuts = output<void>();
  readonly openRanking = output<void>();
  /** Reto del día (null hasta saber la fecha, en el navegador). */
  readonly reto = input<IRetoVista | null>(null);
  readonly openReto = output<void>();
  readonly openCols = output<void>();
  /** Música de fondo encendida (preferencia guardada; en la portada no hay menú). */
  readonly musica = input(false);
  readonly toggleMusica = output<void>();
  /** Voz que lee las preguntas; `null`/`'none'`: aún no se sabe o no hay voz en el dispositivo (no se muestra). */
  readonly voz = input<'on' | 'off' | 'none' | null>(null);
  readonly toggleVoz = output<void>();
  /** Se tocó «Haz tu personaje» (el enlace ya navega; el feed solo lo mide). */
  readonly crear = output<void>();

  protected readonly moreOpen = signal(false);

  private readonly moreBtn = viewChild<ElementRef<HTMLButtonElement>>('moreBtn');
  /** Esc cierra el menú de la barra superior y devuelve el foco a su botón. */
  @HostListener('document:keydown.escape') protected onEscape(): void {
    if (!this.moreOpen()) return;
    this.moreOpen.set(false);
    this.moreBtn()?.nativeElement.focus();
  }
}
