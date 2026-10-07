import { ChangeDetectionStrategy, Component, computed, output, signal } from '@angular/core';

interface IQuizItem { area: string; q: string; options: string[]; answer: number; why: string; }

/** Preguntas originales de muestra (estilo admisión) para probar en la landing sin entrar a ningún curso. */
const ITEMS: IQuizItem[] = [
  { area: 'Razonamiento lógico', q: 'Si hoy es martes, ¿qué día será dentro de 10 días?',
    options: ['Jueves', 'Viernes', 'Sábado'], answer: 1,
    why: '10 días son 1 semana y 3 días: de martes avanzas 3 días y llegas a viernes.' },
  { area: 'Matemáticas', q: 'Un pantalón cuesta $80.000 y tiene 25 % de descuento. ¿Cuánto pagas?',
    options: ['$55.000', '$60.000', '$65.000'], answer: 1,
    why: 'El 25 % de 80.000 es 20.000. 80.000 − 20.000 = 60.000.' },
  { area: 'Lectura crítica', q: '«Aunque llovía, el partido se jugó.» ¿Qué relación expresa «aunque»?',
    options: ['Causa', 'Contraste', 'Consecuencia'], answer: 1,
    why: '«Aunque» presenta un obstáculo que no impide lo que pasa: es una relación de contraste (concesión).' },
];

/** Mini simulacro de 3 preguntas en el hero: el visitante prueba cómo se estudia antes de entrar. */
@Component({
  selector: 'gems-hero-quiz',
  template: `
    <div class="mock" aria-live="polite">
      @if (!done()) {
        <div class="mock__top"><span class="mock__tag">Pruébalo ya · {{ item().area }}</span><span class="mock__n">{{ index() + 1 }}/{{ total }}</span></div>
        <strong class="mock__q" id="hq-q">{{ item().q }}</strong>
        <div class="mock__opts" role="group" aria-labelledby="hq-q">
          @for (o of item().options; track o; let i = $index) {
            <button type="button" class="mock__opt" [disabled]="picked() !== null"
                    [class.mock__opt--ok]="picked() !== null && i === item().answer"
                    [class.mock__opt--bad]="picked() === i && i !== item().answer"
                    (click)="pick(i)">{{ o }}@if (picked() !== null && i === item().answer) { <span aria-hidden="true"> ✓</span> }</button>
          }
        </div>
        @if (picked() !== null) {
          <p class="mock__why"><strong>{{ picked() === item().answer ? 'Correcto.' : 'No exactamente.' }}</strong> {{ item().why }}</p>
          <button type="button" class="btn btn--primary btn--block" (click)="next()">{{ index() + 1 < total ? 'Siguiente pregunta' : 'Ver mi resultado' }}</button>
        }
      } @else {
        <span class="mock__tag">Tu resultado</span>
        <strong class="mock__q">{{ score() }} de {{ total }} {{ score() === total ? 'correctas' : 'correctas. Las que fallaste son las que más enseñan.' }}</strong>
        <p class="mock__why">El curso completo sigue este mismo formato: 5 lecciones cortas y un simulacro final.</p>
        <button type="button" class="btn btn--primary btn--block" (click)="startCourse.emit()">Seguir practicando gratis</button>
        <button type="button" class="mock__again" (click)="restart()">Repetir</button>
      }
    </div>
  `,
  styleUrl: './hero-quiz.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroQuizComponent {
  readonly startCourse = output<void>();
  protected readonly total = ITEMS.length;
  protected readonly index = signal(0);
  protected readonly picked = signal<number | null>(null);
  protected readonly score = signal(0);
  protected readonly done = signal(false);
  protected readonly item = computed(() => ITEMS[this.index()]);

  protected pick(i: number): void {
    this.picked.set(i);
    if (i === this.item().answer) this.score.update(s => s + 1);
  }

  protected next(): void {
    this.picked.set(null);
    if (this.index() + 1 < this.total) this.index.update(i => i + 1);
    else this.done.set(true);
  }

  protected restart(): void {
    this.index.set(0); this.score.set(0); this.picked.set(null); this.done.set(false);
  }
}
