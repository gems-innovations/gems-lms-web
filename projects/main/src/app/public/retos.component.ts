import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PublicHeaderComponent } from './public-header.component';
import { PublicFooterComponent } from './public-footer.component';
import { PublicCatalogService } from './public-catalog.service';
import { CourseStarterService } from './course-starter.service';
import { pop } from './micro-effects';
import { IReto, RETO_SETS } from './retos.data';

/** Después de cuántos retos respondidos aparece la invitación al curso (y se queda visible). */
const INVITAR_DESDE = 3;

/**
 * Página puente de los videos de retos («Piénsala Bien» y similares): los acertijos con su explicación,
 * uno detrás de otro. Tras unos cuantos aparece la invitación al curso gratis de razonamiento.
 * Cada video enlaza con `/retos?r=<id>`: ese acertijo sale primero y luego siguen los demás en su orden.
 */
@Component({
  selector: 'gems-retos',
  imports: [RouterLink, PublicHeaderComponent, PublicFooterComponent],
  template: `
    <gems-public-header />
    <main class="pub">
      <section class="rintro">
        <span class="eyebrow">{{ set.eyebrow }}</span>
        <h1>{{ set.title }} <span class="hl">{{ set.highlight }}</span></h1>
        <p class="lead">{{ set.lead }}</p>
      </section>

      <div class="rgrid">
        <div class="mock" aria-live="polite">
          @if (reto(); as r) {
            <div class="mock__top">
              <span class="mock__tag">{{ r.tag }}</span>
              <span class="mock__n">
                @if (aciertos() > 0) { <span class="mock__streak">{{ aciertos() }} {{ aciertos() === 1 ? 'acierto' : 'aciertos' }}</span> }
                {{ i() + 1 }}/{{ total }}
              </span>
            </div>
            <div class="mock__bar" role="progressbar" [attr.aria-valuenow]="i() + 1" aria-valuemin="1" [attr.aria-valuemax]="total"><span [style.width.%]="((i() + 1) / total) * 100"></span></div>
            <strong class="mock__q" id="reto-q">{{ r.q }}</strong>
            <div class="mock__opts" role="group" aria-labelledby="reto-q">
              @for (o of r.options; track o; let k = $index) {
                <button type="button" class="mock__opt" [disabled]="elegida() !== null"
                        [class.mock__opt--ok]="elegida() !== null && k === r.answer"
                        [class.mock__opt--bad]="elegida() === k && k !== r.answer"
                        (click)="elegir(k, $event)">{{ 'ABCD'[k] }}. {{ o }}@if (elegida() !== null && k === r.answer) { <span aria-hidden="true"> ✓</span> }</button>
              }
            </div>
            @if (elegida() !== null) {
              <p class="mock__why"><strong>{{ elegida() === r.answer ? '¡Bien pensado!' : 'Casi.' }}</strong> {{ r.why }}</p>
              @if (i() + 1 < total) {
                <button type="button" class="btn btn--primary btn--block" (click)="siguiente()">Siguiente reto</button>
              }
            }
          }
          @if (fin()) {
            <p class="mock__why"><strong>¡Los resolviste todos! {{ aciertos() }} de {{ total }}.</strong> Pronto subimos más.</p>
          }
        </div>

        <aside class="rinvita" [class.rinvita--on]="invitar()" aria-labelledby="rinvita-t">
          <span class="eyebrow">{{ set.inviteEyebrow }}</span>
          <h2 id="rinvita-t">{{ set.inviteTitle }}</h2>
          <p>{{ set.inviteText }}</p>
          @if (error(); as e) { <p class="error" role="alert">{{ e }}</p> }
          <button type="button" class="btn btn--primary btn--block" [disabled]="starter.starting() !== null || !cursoId()" (click)="empezarCurso()">
            {{ starter.starting() !== null ? 'Entrando…' : 'Empezar gratis, sin registro' }}
          </button>
          <a class="rinvita__alt" routerLink="/" fragment="cursos">Ver todos los cursos gratis</a>
        </aside>
      </div>
    </main>
    <gems-public-footer />
  `,
  styleUrls: ['./public.scss', './hero-quiz.scss', './retos.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RetosComponent {
  private readonly catalog = inject(PublicCatalogService);
  protected readonly starter = inject(CourseStarterService);

  private readonly route = inject(ActivatedRoute).snapshot;
  /** Juego de retos de la ruta (/retos = lógica, /bloques = Quiz de Bloques). */
  protected readonly set = RETO_SETS[this.route.data['set'] as string] ?? RETO_SETS['logica'];
  /** El reto del video (si viene en el enlace) va primero; un id desconocido deja el orden normal. */
  private readonly lista = ordenar(this.set.items, this.route.queryParamMap.get('r'));
  protected readonly total = this.lista.length;
  protected readonly i = signal(0);
  protected readonly elegida = signal<number | null>(null);
  protected readonly respondidos = signal(0);
  protected readonly aciertos = signal(0);
  protected readonly reto = computed(() => this.lista[this.i()]);
  protected readonly fin = computed(() => this.i() + 1 === this.total && this.elegida() !== null);
  protected readonly invitar = computed(() => this.respondidos() >= INVITAR_DESDE);
  protected readonly error = signal<string | null>(null);
  /** El curso de razonamiento se busca por título en el catálogo público (su id cambia entre ambientes). */
  protected readonly cursoId = signal<number | null>(null);

  constructor() {
    this.catalog.courses().subscribe({
      next: list => this.cursoId.set((list.find(c => /acertijo/i.test(c.title)) ?? list.find(c => /razonamiento/i.test(c.title)) ?? list[0])?.id ?? null),
      error: () => this.cursoId.set(null),
    });
  }

  protected elegir(k: number, event: Event): void {
    this.elegida.set(k);
    this.respondidos.update(n => n + 1);
    if (k === this.reto().answer) { this.aciertos.update(n => n + 1); void pop(event.currentTarget as Element); }
  }

  protected siguiente(): void {
    this.elegida.set(null);
    this.i.update(n => Math.min(n + 1, this.total - 1));
  }

  protected async empezarCurso(): Promise<void> {
    const id = this.cursoId();
    if (!id) return;
    this.error.set(await this.starter.start(id));
  }
}

function ordenar(items: IReto[], id: string | null): IReto[] {
  const k = items.findIndex(r => r.id === id);
  return k < 0 ? items : [items[k], ...items.filter((_, j) => j !== k)];
}
