import { ChangeDetectionStrategy, Component, ElementRef, HostListener, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { TapsSocialService } from './taps-social.service';
import { cifraCompacta } from './taps.social';

/**
 * Riel de acciones del Tap. Dos formas del mismo componente:
 * - móvil (por defecto): riel tipo TikTok sobre el mundo y nunca encima de las opciones (experiencia-ux.md §3.1), solo lo
 *   que funciona hoy: «Más» y «Enviar». «Más» es un menú, igual que en escritorio (antes saltaba de Tap a mitad de una
 *   pregunta): «Otro de <tema>» y «No me interesa este tema» (se deshace desde el mismo menú). Arriba, «Me gusta» con su cifra
 *   (solo si el API social responde: TapsSocialService; sin él no hay botón).
 * - escritorio (`desktop`): fuera del escenario, pegado a su derecha (escritorio.md §5). Flechas ↑/↓ arriba y, abajo, tema,
 *   Retar y Más (menú). «Guardar» no está: no hay cuentas todavía y un botón muerto enseña a no tocar.
 */
@Component({
  selector: 'gems-tap-rail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!desktop()) {
      <nav class="rail" aria-label="Acciones del Tap">
        @if (gusta(); as g) {
          <button type="button" class="rail__btn rail__gusta" [attr.aria-pressed]="g.meGustaYo" (click)="social.alternar(tapId()!)" [attr.aria-label]="'Me gusta (' + g.meGusta + ')'">
            <span class="gm-icono gm-icono--flotante rail__icon"><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M12 20.5s-7.6-4.6-9.4-9.2C1.3 8 3.4 4.8 6.8 4.8c2 0 3.7 1.1 5.2 3 1.5-1.9 3.2-3 5.2-3 3.4 0 5.5 3.2 4.2 6.5-1.8 4.6-9.4 9.2-9.4 9.2z" fill="currentColor"/></svg></span>
            <span class="rail__label" aria-hidden="true">{{ cifra(g.meGusta) }}</span>
          </button>
        }
        <div class="rail__more">
          <button type="button" class="rail__btn" (click)="toggleMenu($event)" #moreBtn [attr.aria-expanded]="menuOpen()" aria-controls="rail-mas-movil" aria-label="Más opciones">
            <span class="gm-icono gm-icono--flotante rail__icon"><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><circle cx="5.5" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="18.5" cy="12" r="2" fill="currentColor"/></svg></span>
            <span class="rail__label">Más</span>
          </button>
          @if (menuOpen()) {
            <div class="rail__menu rail__menu--movil" id="rail-mas-movil">
              <button type="button" (click)="pick(() => more.emit())">Otro de {{ topicName() }}</button>
              @if (blocked()) {
                <button type="button" (click)="pick(() => unblock.emit())">Volver a mostrar {{ topicName() }}</button>
              } @else {
                <button type="button" (click)="pick(() => notInterested.emit())">No me interesa este tema</button>
              }
              <!-- PR-7 (§A.2): salir del juego hacia crear, desde el mismo menú y con su mismo estilo. -->
              @if (crear()) { <button type="button" (click)="pick(() => crearPersonaje.emit())">Haz tu personaje</button> }
            </div>
          }
        </div>
        <button type="button" class="rail__btn" (click)="share.emit()" aria-label="Compartir este Tap">
          <span class="gm-icono gm-icono--flotante rail__icon"><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M14 5l7 7-7 7M21 12H10a7 7 0 0 0-7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          <span class="rail__label">Enviar</span>
        </button>
      </nav>
    } @else {
      <nav class="rail rail--escritorio" aria-label="Acciones del Tap">
        <div class="rail__nav">
          <button type="button" class="rail__btn rail__btn--flecha" (click)="prev.emit()" [disabled]="!canPrev()" aria-label="Tap anterior" aria-keyshortcuts="ArrowUp K">
            <span class="gm-icono gm-icono--flotante rail__icon"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="m6 15 6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          </button>
          <button type="button" class="rail__btn rail__btn--flecha" [class.is-pulse]="pulse()" (click)="nextTap.emit()" [disabled]="!canNext()" aria-label="Siguiente Tap" aria-keyshortcuts="ArrowDown J">
            <span class="gm-icono gm-icono--flotante rail__icon"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
            @if (nextTitle()) { <span class="rail__tip" role="tooltip">Siguiente: {{ nextTitle() }}</span> }
          </button>
        </div>
        <div class="rail__actions">
          <button type="button" class="rail__btn" (click)="filterTopic.emit()" [attr.aria-label]="'Ver solo Taps de ' + topicName()">
            <span class="gm-icono gm-icono--flotante rail__icon rail__topic" [style.--tinte]="topicColor()"><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M16.5 13.5v6M13.5 16.5h6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg></span>
            <span class="rail__label">Tema</span>
          </button>
          @if (gusta(); as g) {
            <button type="button" class="rail__btn rail__gusta" [attr.aria-pressed]="g.meGustaYo" (click)="social.alternar(tapId()!)" [attr.aria-label]="'Me gusta (' + g.meGusta + ')'">
              <span class="gm-icono gm-icono--flotante rail__icon"><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M12 20.5s-7.6-4.6-9.4-9.2C1.3 8 3.4 4.8 6.8 4.8c2 0 3.7 1.1 5.2 3 1.5-1.9 3.2-3 5.2-3 3.4 0 5.5 3.2 4.2 6.5-1.8 4.6-9.4 9.2-9.4 9.2z" fill="currentColor"/></svg></span>
              <span class="rail__label" aria-hidden="true">{{ cifra(g.meGusta) }}</span>
            </button>
          }
          <button type="button" class="rail__btn" [class.is-hot]="finished()" (click)="share.emit()" aria-label="Retar a un amigo" aria-keyshortcuts="R">
            <span class="gm-icono gm-icono--flotante rail__icon"><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M14 5l7 7-7 7M21 12H10a7 7 0 0 0-7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
            <span class="rail__label">Retar</span>
          </button>
          <div class="rail__more">
            <button type="button" class="rail__btn" (click)="toggleMenu($event)" #moreBtn [attr.aria-expanded]="menuOpen()" aria-controls="rail-mas" aria-label="Más opciones">
              <span class="gm-icono gm-icono--flotante rail__icon"><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><circle cx="5.5" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="18.5" cy="12" r="2" fill="currentColor"/></svg></span>
              <span class="rail__label">Más</span>
            </button>
            @if (menuOpen()) {
              <div class="rail__menu" id="rail-mas">
                <button type="button" (click)="pick(() => more.emit())">Siguiente Tap de {{ topicName() }}</button>
                @if (blocked()) {
                  <button type="button" (click)="pick(() => unblock.emit())">Volver a mostrar {{ topicName() }}</button>
                } @else {
                  <button type="button" (click)="pick(() => notInterested.emit())">No me interesa este tema</button>
                }
                @if (crear()) { <button type="button" (click)="pick(() => crearPersonaje.emit())">Haz tu personaje</button> }
                <button type="button" (click)="pick(() => toggleKeys.emit())">Atajos de teclado: {{ keysOn() ? 'apagar' : 'encender' }}</button>
              </div>
            }
          </div>
        </div>
      </nav>
    }
  `,
  styleUrl: './tap-rail.component.scss',
  // Móvil: el riel está a la derecha y su menú se abre hacia la izquierda (aparte del .scss, que está al límite de su presupuesto).
  styles: '.rail__menu--movil { left: auto; right: calc(100% + 6px); }',
})
export class TapRailComponent {
  readonly topicName = input('este tema');
  readonly topicColor = input('#8b93a7');
  readonly desktop = input(false);
  readonly canPrev = input(true);
  readonly canNext = input(true);
  /** Tras el primer resultado: anillo pulsante en la flecha ↓ (invita a seguir). */
  readonly pulse = input(false);
  readonly finished = input(false);
  readonly nextTitle = input<string | null>(null);
  readonly blocked = input(false);
  readonly keysOn = input(true);
  /** «Haz tu personaje» en el menú «Más» (PR-7): solo en /taps, no en la portada (allí ya está la tarjeta). */
  readonly crear = input(false);
  readonly crearPersonaje = output<void>();
  /** Tap del riel, para su me gusta. Sin él (o sin API social) no hay corazón. */
  readonly tapId = input<string | null>(null);
  protected readonly social = inject(TapsSocialService);
  protected readonly cifra = cifraCompacta;
  protected readonly gusta = computed(() => { const id = this.tapId(); return id && this.social.disponible() === true ? this.social.datos()[id] ?? null : null; });
  constructor() { effect(() => { const id = this.tapId(); if (id) this.social.pedir([id]); }); }

  readonly more = output<void>();
  readonly filterTopic = output<void>();
  readonly share = output<void>();
  readonly prev = output<void>();
  readonly nextTap = output<void>();
  readonly notInterested = output<void>();
  readonly unblock = output<void>();
  readonly toggleKeys = output<void>();

  protected readonly menuOpen = signal(false);

  protected toggleMenu(event: Event): void { event.stopPropagation(); this.menuOpen.update(v => !v); }
  protected pick(action: () => void): void { this.menuOpen.set(false); action(); }

  @HostListener('document:click') protected closeMenu(): void { if (this.menuOpen()) this.menuOpen.set(false); }
  private readonly moreBtn = viewChild<ElementRef<HTMLButtonElement>>('moreBtn');
  /** Esc cierra «Más» y devuelve el foco al botón que lo abrió (sin trampa de teclado). */
  @HostListener('document:keydown.escape') protected closeOnEscape(): void {
    if (!this.menuOpen()) return;
    this.menuOpen.set(false);
    this.moreBtn()?.nativeElement.focus();
  }
}
