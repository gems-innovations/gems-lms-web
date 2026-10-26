import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { ICard } from '../../../../domain/model/course.model';
import { cardQuestions } from '../../../../application/cards';

/** Distancia mínima (px) de un arrastre horizontal para pasar de carta. */
const SWIPE_MIN = 48;

/**
 * Cartas horizontales del profesor (idea, pregunta, pasos animados, imagen): el estudiante las desliza de lado.
 * Cada pregunta se responde ANTES de ver la explicación y la carta siguiente no se abre hasta responder; los pasos
 * aparecen uno a uno. Al llegar a la pantalla final emite `completed` (el reproductor marca el bloque como hecho).
 */
@Component({
  selector: 'edu-cards-player',
  template: `
    <section class="cp" [attr.aria-label]="heading()" (keydown)="onKey($event)">
      <div class="cp__top">
        <p class="cp__n" aria-live="polite">{{ shown() }} de {{ total() }}</p>
      </div>
      <div class="cp__bar" role="progressbar" [attr.aria-label]="'Progreso de ' + heading()"
           aria-valuemin="1" [attr.aria-valuenow]="shown()" [attr.aria-valuemax]="total()">
        <span [style.width.%]="(shown() / total()) * 100"></span>
      </div>

      <div class="cp__stage" (pointerdown)="down($event)" (pointerup)="up($event)" (pointercancel)="cancel()">
        <div class="cp__track" [style.--i]="current()">
          @for (c of cards(); track $index; let i = $index) {
            <section class="card" [class.card--on]="i === current()" [attr.inert]="i === current() ? null : ''"
                     [attr.aria-hidden]="i === current() ? null : 'true'" [attr.aria-label]="'Carta ' + (i + 1) + ' de ' + total()">
              <span class="card__tag">{{ c.label }}</span>
              @switch (c.kind) {
                @case ('idea') {
                  <div class="card__main">
                    <h3 class="card__h" [attr.tabindex]="i === current() ? -1 : null" [id]="i === current() ? uid + '-h' : null">{{ c.title }}</h3>
                    <p class="card__text">{{ c.text }}</p>
                  </div>
                  @if (c.remember) { <div class="card__side"><p class="card__remember"><span>Para recordar</span>{{ c.remember }}</p></div> }
                }
                @case ('question') {
                  <div class="card__main">
                    @if (c.scene) { <p class="card__scene">{{ c.scene }}</p> }
                    <h3 class="card__h" [attr.tabindex]="i === current() ? -1 : null" [id]="i === current() ? uid + '-h' : null">{{ c.question }}</h3>
                  </div>
                  <div class="card__side">
                  <div class="card__opts" role="group" [class.card__opts--done]="answerOf(i) !== null">
                    @for (o of c.options; track $index; let k = $index) {
                      <button type="button" class="card__opt" [disabled]="answerOf(i) !== null"
                              [class.card__opt--ok]="answerOf(i) !== null && k === c.answer"
                              [class.card__opt--bad]="answerOf(i) === k && k !== c.answer"
                              [class.gm-acierto]="answerOf(i) === k && k === c.answer"
                              [class.gm-error]="answerOf(i) === k && k !== c.answer"
                              (click)="answer(i, k)">
                        <span class="card__key">{{ 'ABCDEF'[k] }}</span>{{ o }}
                      </button>
                    }
                  </div>
                  @if (answerOf(i) !== null) {
                    <p class="card__why gm-aparecer" role="status"><strong>{{ answerOf(i) === c.answer ? 'Bien pensado.' : 'Casi.' }}</strong> {{ c.why }}</p>
                  }
                  </div>
                }
                @case ('steps') {
                  <div class="card__main">
                    <h3 class="card__h" [attr.tabindex]="i === current() ? -1 : null" [id]="i === current() ? uid + '-h' : null">{{ c.title }}</h3>
                  </div>
                  <div class="card__side">
                  <ol class="card__steps">
                    @for (s of c.steps; track $index; let k = $index) {
                      @if (k < revealed(i)) { <li class="card__step">{{ s }}</li> }
                    }
                  </ol>
                  @if (revealed(i) < c.steps.length) {
                    <button type="button" class="cp__btn cp__btn--sub" (click)="reveal(i)">Mostrar el siguiente paso ({{ revealed(i) }} de {{ c.steps.length }})</button>
                  }
                  </div>
                }
                @case ('image') {
                  <div class="card__main">
                    <h3 class="card__h" [attr.tabindex]="i === current() ? -1 : null" [id]="i === current() ? uid + '-h' : null">{{ c.title }}</h3>
                    @if (c.caption) { <p class="card__text">{{ c.caption }}</p> }
                  </div>
                  <div class="card__side"><img class="card__img" [src]="c.url" [alt]="c.alt" loading="lazy" /></div>
                }
              }
            </section>
          }
          <section class="card card--fin" [class.card--on]="current() === total()" [attr.inert]="current() === total() ? null : ''"
                   [attr.aria-hidden]="current() === total() ? null : 'true'" aria-label="Resultado">
            <span class="card__tag">Terminaste</span>
            <h3 class="card__h" [attr.tabindex]="current() === total() ? -1 : null" [id]="current() === total() ? uid + '-h' : null">
              @if (questionCount() > 0) { {{ correct() }} de {{ questionCount() }} bien al primer intento } @else { Cartas completas }
            </h3>
            <p class="card__text">Repasa cualquier carta con la flecha de la izquierda o empieza otra vez.</p>
            <button type="button" class="cp__btn cp__btn--sub" (click)="restart()">Volver a empezar</button>
          </section>
        </div>
      </div>

      <nav class="cp__nav" aria-label="Moverse por las cartas">
        <button type="button" class="cp__btn cp__btn--icon" [disabled]="current() === 0" (click)="go(current() - 1)" aria-label="Carta anterior">&lsaquo;</button>
        <span class="cp__dots" aria-hidden="true">
          @for (c of cards(); track $index; let i = $index) { <i [class.on]="i <= current()"></i> }
          <i [class.on]="current() >= total()"></i>
        </span>
        <!-- En la pantalla final no hay siguiente: el botón se aparta para no pedir algo que ya no aplica. -->
        @if (current() < total()) {
          <button type="button" class="cp__btn cp__btn--next" [disabled]="!canAdvance()" (click)="go(current() + 1)"
                  [attr.aria-label]="canAdvance() ? 'Carta siguiente' : hint()">
            {{ canAdvance() ? (current() + 1 === total() ? 'Ver resultado' : 'Siguiente') : hint() }} &rsaquo;
          </button>
        } @else {
          <span class="cp__fin-hueco" aria-hidden="true"></span>
        }
      </nav>
    </section>
  `,
  styleUrl: './cards-player.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardsPlayerComponent {
  readonly cards = input.required<ICard[]>();
  readonly heading = input('Cartas');
  readonly completed = output<void>();

  protected readonly uid = `cp${Math.random().toString(36).slice(2, 8)}`;
  protected readonly current = signal(0);
  private readonly answers = signal<Record<number, number>>({});
  private readonly shownSteps = signal<Record<number, number>>({});
  private doneEmitted = false;
  private startX: number | null = null;

  protected readonly total = computed(() => this.cards().length);
  protected readonly shown = computed(() => Math.min(this.current() + 1, this.total()));
  protected readonly questionCount = computed(() => cardQuestions(this.cards()).length);
  protected readonly correct = computed(() => {
    const a = this.answers();
    return this.cards().filter((c, i) => c.kind === 'question' && a[i] === c.answer).length;
  });
  protected readonly canAdvance = computed(() => {
    const i = this.current();
    const c = this.cards()[i];
    if (!c) return false;
    if (c.kind === 'question') return this.answers()[i] !== undefined;
    if (c.kind === 'steps') return this.revealed(i) >= c.steps.length;
    return true;
  });
  protected readonly hint = computed(() => this.cards()[this.current()]?.kind === 'steps' ? 'Muestra todos los pasos' : 'Responde para seguir');

  constructor() {
    // El título de la carta recibe el foco al cambiar: quien usa lector de pantalla oye la carta nueva. No al cargar:
    // el reproductor puede aparecer al bajar la página (@defer on viewport) y robarle el foco a quien lee.
    let primera = true;
    effect(() => {
      this.current();
      if (primera) { primera = false; return; }
      queueMicrotask(() => (document.getElementById(`${this.uid}-h`) as HTMLElement | null)?.focus({ preventScroll: true }));
    });
  }

  protected answerOf(i: number): number | null { return this.answers()[i] ?? null; }
  protected revealed(i: number): number { return this.shownSteps()[i] ?? 0; }

  protected answer(i: number, k: number): void {
    if (this.answers()[i] !== undefined) return;
    this.answers.update(m => ({ ...m, [i]: k }));
  }

  protected reveal(i: number): void {
    this.shownSteps.update(m => ({ ...m, [i]: (m[i] ?? 0) + 1 }));
  }

  protected go(n: number): void {
    const to = Math.max(0, Math.min(n, this.total()));
    if (to > this.current() && !this.canAdvance()) return;
    this.current.set(to);
    if (to === this.total() && !this.doneEmitted) { this.doneEmitted = true; this.completed.emit(); }
  }

  protected restart(): void {
    this.answers.set({});
    this.shownSteps.set({});
    this.current.set(0);
  }

  protected onKey(e: KeyboardEvent): void {
    if (e.key === 'ArrowRight') this.go(this.current() + 1);
    else if (e.key === 'ArrowLeft') this.go(this.current() - 1);
  }

  protected down(e: PointerEvent): void {
    this.startX = (e.target as HTMLElement).closest('button, a') ? null : e.clientX;
  }

  protected up(e: PointerEvent): void {
    if (this.startX === null) return;
    const dx = e.clientX - this.startX;
    this.startX = null;
    if (Math.abs(dx) >= SWIPE_MIN) this.go(this.current() + (dx < 0 ? 1 : -1));
  }

  protected cancel(): void { this.startX = null; }
}
