import { ChangeDetectionStrategy, Component, computed, output, signal } from '@angular/core';

interface IQuizItem { area: string; q: string; options: string[]; answer: number; why: string; }

/** Preguntas originales de muestra para probar la trivia sin entrar a ningún curso. */
const ITEMS: IQuizItem[] = [
  { area: 'Minecraft · Obsidiana', q: '¿Con qué pico puedes minar obsidiana y que el bloque suelte algo?',
    options: ['Pico de hierro', 'Pico de diamante', 'Pico de piedra'], answer: 1,
    why: 'La obsidiana solo suelta su bloque con un pico de diamante o de netherita. Con los demás se rompe, pero no obtienes nada.' },
  { area: 'Minecraft · Nether', q: '¿Cuántos bloques de obsidiana necesitas como mínimo para armar un portal al Nether?',
    options: ['8', '10', '14'], answer: 1,
    why: 'El marco mínimo mide 4×5 y no necesita las cuatro esquinas: son 10 bloques. Con las esquinas serían 14.' },
  { area: 'Mates con cofres', q: 'Un cofre grande tiene 54 espacios y en cada uno cabe una pila de 64 bloques. ¿Cuántos bloques guardas si lo llenas?',
    options: ['3.264', '3.456', '3.564'], answer: 1,
    why: '54 × 64 = 3.456. Atajo: 50 × 64 = 3.200 y 4 × 64 = 256; 3.200 + 256 = 3.456.' },
];

/** Trivia de tres preguntas en el hero: el visitante prueba cómo se estudia antes de entrar. */
@Component({
  selector: 'kc-quiz',
  template: `
    <div class="quiz" aria-live="polite">
      @if (!done()) {
        <div class="quiz__top">
          <span class="quiz__tag">{{ item().area }}</span>
          <span class="quiz__n">
            @if (streak() > 0) { <span class="quiz__streak" [attr.aria-label]="'Racha de ' + streak() + ' aciertos seguidos'">Racha {{ streak() }}</span> }
            {{ index() + 1 }}/{{ total }}
          </span>
        </div>
        <div class="quiz__bar" role="progressbar" [attr.aria-valuenow]="index() + 1" aria-valuemin="0" [attr.aria-valuemax]="total">
          <span [style.width.%]="((index() + 1) / total) * 100"></span>
        </div>
        <strong class="quiz__q" id="kcq-q">{{ item().q }}</strong>
        <div class="quiz__opts" role="group" aria-labelledby="kcq-q">
          @for (o of item().options; track o; let i = $index) {
            <button type="button" class="quiz__opt" [disabled]="picked() !== null"
                    [class.quiz__opt--ok]="picked() !== null && i === item().answer"
                    [class.quiz__opt--bad]="picked() === i && i !== item().answer"
                    (click)="pick(i)">{{ o }}@if (picked() !== null && i === item().answer) { <span aria-hidden="true"> ✓</span> }</button>
          }
        </div>
        @if (picked() !== null) {
          <p class="quiz__why"><strong>{{ picked() === item().answer ? '¡Correcto!' : 'Casi.' }}</strong> {{ item().why }}</p>
          <button type="button" class="kc-btn kc-btn--gold kc-btn--block" (click)="next()">{{ index() + 1 < total ? 'Siguiente pregunta' : 'Ver mi resultado' }}</button>
        }
      } @else {
        <span class="quiz__tag">Tu resultado</span>
        <strong class="quiz__q"><span class="quiz__score">{{ score() }}</span> de {{ total }} {{ score() === total ? 'correctas. ¡Nivel experto!' : 'correctas. Las que fallaste son las que más enseñan.' }}</strong>
        <p class="quiz__why">Los cursos completos siguen este formato: lecciones cortas, ejemplos resueltos y explicación de cada respuesta.</p>
        <button type="button" class="kc-btn kc-btn--gold kc-btn--block" (click)="startCourse.emit()">Seguir jugando gratis</button>
        <button type="button" class="quiz__again" (click)="restart()">Repetir</button>
      }
    </div>
  `,
  styleUrl: './kc-quiz.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KcQuizComponent {
  readonly startCourse = output<void>();
  protected readonly total = ITEMS.length;
  protected readonly index = signal(0);
  protected readonly picked = signal<number | null>(null);
  protected readonly score = signal(0);
  protected readonly done = signal(false);
  protected readonly streak = signal(0);
  protected readonly item = computed(() => ITEMS[this.index()]);

  protected pick(i: number): void {
    this.picked.set(i);
    if (i === this.item().answer) { this.score.update(s => s + 1); this.streak.update(s => s + 1); }
    else this.streak.set(0);
  }

  protected next(): void {
    this.picked.set(null);
    if (this.index() + 1 < this.total) this.index.update(i => i + 1);
    else this.done.set(true);
  }

  protected restart(): void {
    this.index.set(0); this.score.set(0); this.streak.set(0); this.picked.set(null); this.done.set(false);
  }
}
