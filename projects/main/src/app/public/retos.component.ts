import { DOCUMENT } from '@angular/common';
import { afterNextRender, ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PublicHeaderComponent } from './public-header.component';
import { PublicFooterComponent } from './public-footer.component';
import { PublicCatalogService } from './public-catalog.service';
import { CourseStarterService } from './course-starter.service';
import { LucideCircleCheck, LucideX } from '@lucide/angular';
import { celebrarEn } from 'shared';
import { IReto, RETO_SETS } from './retos.data';
import { BusyLabelComponent } from 'shared/loading';

/** Después de cuántos retos respondidos aparece la invitación al curso (y se queda visible). */
const INVITAR_DESDE = 3;
/** Chip que muestra todos los temas. */
const TODOS = 'Todos';

/**
 * Página puente de los videos de retos («Piénsala Bien» y similares): los acertijos con su explicación,
 * uno detrás de otro. Tras unos cuantos aparece la invitación al curso gratis de razonamiento.
 * Cada video enlaza con `/retos?r=<id>`: ese acertijo sale primero y luego siguen los demás en su orden.
 */
@Component({
  selector: 'gems-retos',
  imports: [RouterLink, PublicHeaderComponent, PublicFooterComponent, LucideCircleCheck, LucideX, BusyLabelComponent],
  template: `
    <gems-public-header />
    <main class="pub">
      <section class="rintro">
        <span class="eyebrow">{{ set.eyebrow }}</span>
        <h1>{{ set.title }} <span class="hl">{{ set.highlight }}</span></h1>
        <p class="lead">{{ set.lead }}</p>
      </section>

      @if (set.categorias) {
        <div class="rcats" role="group" aria-label="Filtrar por tema">
          @for (c of chips(); track c.nombre) {
            <button type="button" class="rcats__chip" [class.rcats__chip--on]="categoria() === c.nombre" [attr.aria-pressed]="categoria() === c.nombre" (click)="elegirCategoria(c.nombre)">
              {{ c.nombre }} <span class="rcats__n">{{ c.n }}</span>
            </button>
          }
        </div>
      }

      <div class="rgrid">
        <div class="mock" #tarjeta aria-live="polite">
          @if (reto(); as r) {
            <div class="mock__top">
              <span class="mock__tag">{{ r.tag }}</span>
              <span class="mock__n">
                @if (aciertos() > 0) { <span class="mock__streak gm-pop">{{ aciertos() }} {{ aciertos() === 1 ? 'acierto' : 'aciertos' }}</span> }
                {{ i() + 1 }}/{{ total() }}
              </span>
            </div>
            <div class="mock__bar gm-progreso" role="progressbar" [attr.aria-valuenow]="i() + 1" aria-valuemin="1" [attr.aria-valuemax]="total()"><span [style.--p]="(i() + 1) / total()"></span></div>
            <strong class="mock__q" id="reto-q">{{ r.q }}</strong>
            <div class="mock__opts" [class.mock__opts--done]="elegida() !== null" role="group" aria-labelledby="reto-q">
              @for (o of r.options; track o; let k = $index) {
                <button type="button" class="mock__opt" [disabled]="elegida() !== null"
                        [class.mock__opt--ok]="elegida() !== null && k === r.answer"
                        [class.mock__opt--bad]="elegida() === k && k !== r.answer"
                        [class.gm-acierto]="elegida() === k && k === r.answer"
                        [class.gm-error]="elegida() === k && k !== r.answer"
                        (click)="elegir(k, tarjeta)"><span class="mock__key">{{ 'ABCD'[k] }}</span> {{ o }}
                  @if (elegida() !== null && k === r.answer) { <svg lucideCircleCheck [size]="20" aria-hidden="true"></svg> }
                  @else if (elegida() === k) { <svg lucideX [size]="20" aria-hidden="true"></svg> }
                </button>
              }
            </div>
            @if (elegida() !== null) {
              <p class="mock__why gm-aparecer"><strong>{{ elegida() === r.answer ? '¡Bien pensado!' : 'Casi.' }}</strong> {{ r.why }}</p>
              @if (i() + 1 < total()) {
                <button type="button" class="btn btn--primary btn--block" (click)="siguiente()">Siguiente reto</button>
              }
            }
          }
          @if (fin()) {
            <p class="mock__why gm-pop"><strong>{{ set.categorias ? 'Terminaste este tema.' : '¡Los resolviste todos!' }} {{ aciertos() }} de {{ respondidos() }} acertadas.</strong> {{ set.categorias ? 'Prueba otro tema o comparte tu puntaje.' : 'Pronto subimos más.' }}</p>
          }
          @if (set.categorias && respondidos() > 0) {
            <div class="rshare">
              <button type="button" class="btn rshare__btn" (click)="compartir()">Comparte tu puntaje</button>
              @if (aviso(); as a) { <p class="rshare__msg" role="status">{{ a }}</p> }
            </div>
          }
        </div>

        <aside class="rinvita" [class.rinvita--on]="invitar()" aria-labelledby="rinvita-t">
          <span class="eyebrow">{{ set.inviteEyebrow }}</span>
          <h2 id="rinvita-t">{{ set.inviteTitle }}</h2>
          <p>{{ set.inviteText }}</p>
          @if (error(); as e) { <p class="error" role="alert">{{ e }}</p> }
          <button type="button" class="btn btn--primary btn--block" [disabled]="starter.starting() !== null || !cursoId()"
                  [attr.aria-busy]="starter.starting() !== null" (click)="empezarCurso()">
            <lib-busy-label [busy]="starter.starting() !== null" busyText="Entrando…">Empezar gratis, sin registro</lib-busy-label>
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
  /** Tema elegido en los chips (solo los juegos con categorías). «Todos» no filtra. */
  protected readonly categoria = signal(TODOS);
  /** El reto del video (si viene en el enlace) va primero; un id desconocido deja el orden normal. */
  private readonly idVideo = this.route.queryParamMap.get('r');
  private readonly lista = computed(() => {
    const c = this.categoria();
    return ordenar(c === TODOS ? this.set.items : this.set.items.filter(r => r.tag === c), this.idVideo);
  });
  protected readonly chips = computed(() => [TODOS, ...(this.set.categorias ?? [])]
    .map(nombre => ({ nombre, n: nombre === TODOS ? this.set.items.length : this.set.items.filter(r => r.tag === nombre).length }))
    .filter(c => c.n > 0));
  protected readonly total = computed(() => this.lista().length);
  protected readonly i = signal(0);
  /** Respuesta elegida por id de reto: así cambiar de tema no cuenta dos veces la misma pregunta. */
  private readonly respuestas = signal<Record<string, number>>({});
  protected readonly reto = computed(() => this.lista()[this.i()]);
  protected readonly elegida = computed(() => this.respuestas()[this.reto()?.id] ?? null);
  protected readonly respondidos = computed(() => Object.keys(this.respuestas()).length);
  protected readonly aciertos = computed(() => this.set.items.filter(r => this.respuestas()[r.id] === r.answer).length);
  protected readonly fin = computed(() => this.i() + 1 === this.total() && this.elegida() !== null);
  protected readonly invitar = computed(() => this.respondidos() >= INVITAR_DESDE);
  protected readonly aviso = signal<string | null>(null);
  private readonly doc = inject(DOCUMENT);
  protected readonly error = signal<string | null>(null);
  /** El curso de la invitación se busca por título en el catálogo público (su id cambia entre ambientes). */
  protected readonly cursoId = signal<number | null>(null);

  constructor() {
    // Solo en el navegador: el prerender no debe depender del API ni hornear el id del curso de ese ambiente.
    afterNextRender(() => this.cargarCurso());
  }

  private cargarCurso(): void {
    this.catalog.courses().subscribe({
      next: list => this.cursoId.set((list.find(c => new RegExp(this.set.cursoBuscar ?? 'acertijo', 'i').test(c.title)) ?? list.find(c => /razonamiento/i.test(c.title)) ?? list[0])?.id ?? null),
      error: () => this.cursoId.set(null),
    });
  }

  protected elegir(k: number, tarjeta: HTMLElement): void {
    const r = this.reto();
    this.respuestas.update(m => ({ ...m, [r.id]: k }));
    // Cada 5 aciertos, un confeti pequeño que sale de la tarjeta (no de toda la pantalla).
    if (k === r.answer && this.aciertos() > 0 && this.aciertos() % 5 === 0) void celebrarEn(tarjeta);
  }

  protected siguiente(): void {
    this.i.update(n => Math.min(n + 1, this.total() - 1));
  }

  protected elegirCategoria(nombre: string): void {
    this.categoria.set(nombre);
    this.i.set(0);
  }

  /** Comparte el puntaje con el menú del sistema si existe; si no, copia el texto al portapapeles. */
  protected async compartir(): Promise<void> {
    const nav = this.doc.defaultView?.navigator;
    const url = `${this.doc.location.origin}${this.doc.location.pathname}`;
    const text = `Acerté ${this.aciertos()} de ${this.respondidos()} en el ${this.set.nombreCompartir ?? 'quiz'}, ¿cuántas aciertas tú?`;
    try {
      if (nav?.share) { await nav.share({ text, url }); this.aviso.set('¡Listo, compartido!'); return; }
      await nav?.clipboard.writeText(`${text} ${url}`);
      this.aviso.set('Copiado. Pégalo donde quieras.');
    } catch (e) {
      // Cerrar el menú de compartir no es un error.
      this.aviso.set((e as { name?: string })?.name === 'AbortError' ? null : 'No se pudo copiar. Copia el enlace de la barra y compártelo.');
    }
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
