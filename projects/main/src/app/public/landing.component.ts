import { afterNextRender, ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { COURSE_CATEGORIES, categoryOf } from './course-categories';
import { RouterLink } from '@angular/router';
import { timeout } from 'rxjs';
import { PublicHeaderComponent } from './public-header.component';
import { PublicFooterComponent } from './public-footer.component';
import { DIFFICULTY_LABEL, IPublicCourse, PublicCatalogService } from './public-catalog.service';
import { CourseStarterService } from './course-starter.service';
import { TiltDirective } from './micro-effects';
import {
  LucideArrowRight, LucideBookOpen, LucideBox, LucideBrain, LucideChartLine, LucideLightbulb, LucidePuzzle, LucideSchool,
  LucideShuffle, LucideUsers,
} from '@lucide/angular';
import { BusyLabelComponent, LoadErrorComponent, SkeletonComponent } from 'shared/loading';
import { EMPTY_STATES, EmptyStateComponent } from 'shared';
import { TapsFeedComponent } from '../taps/taps-feed.component';
import { TAP_TOPICS, TAPS } from '../taps/taps.data';
import { feedTopics } from '../taps/taps.logic';
import { AnalyticsService } from '../analytics.service';
import { eventSlug } from '../analytics-taxonomy';
import { TenantService } from '../tenant.service';
import { COPY_ENTRADA } from '../taps/taps.crear-entrada';
import { CORREO_CONTACTO } from './contacto';

/**
 * Destinos que se miden desde la portada (`cursos` = abre o empieza un curso; `cursos-ancla` = baja a la lista) (`portada/opcion/<destino>`, producto/retencion/plan-retencion.md).
 * `instituciones-<heroe|franja|muestra>` = de dónde baja la gente a la sección institucional; `camino/<paso>` = el paso
 * elegido en «De un Tap a un curso» (producto/portada/backlog-auditoria-ux-2026-10-26.md).
 */
type TPortadaDestino = 'taps' | `temas/${string}` | 'retos' | 'bloques' | 'cursos' | 'cursos-ancla' | 'instituciones'
  | 'instituciones-heroe' | 'instituciones-franja' | 'instituciones-muestra' | `camino/${'jugar' | 'cursos' | 'instituciones'}`
  | `cierre/${'jugar' | 'instituciones'}` | 'entrar' | 'crear';

/**
 * Portada de GEMS LMS con la filosofía de Taps (variante B de producto/retencion/plan-retencion.md): se juega desde el
 * primer fotograma. Arriba, un Tap jugable (el mismo feed de /taps en modo «portada», prerenderizado con su pregunta y
 * sus opciones); al lado en escritorio, o al bajar en celular, las demás puertas: seguir con más Taps, temas, retos,
 * cursos gratis (catálogo del API, solo en el navegador), instituciones y entrar. Responder es libre y sin cuenta.
 */
@Component({
  selector: 'gems-landing',
  imports: [RouterLink, PublicHeaderComponent, PublicFooterComponent, TapsFeedComponent, TiltDirective,
    LucideArrowRight, LucideBookOpen, LucideBox, LucideBrain, LucideChartLine, LucideLightbulb, LucidePuzzle, LucideSchool,
    LucideShuffle, LucideUsers, SkeletonComponent, LoadErrorComponent, BusyLabelComponent, EmptyStateComponent],
  templateUrl: './landing.component.html',
  styleUrls: ['./public.scss', './landing-extra.scss', './landing-piezas.scss', './portada-secciones.scss', './portada.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent {
  private readonly catalog = inject(PublicCatalogService);
  private readonly analytics = inject(AnalyticsService);
  private readonly tenant = inject(TenantService);
  protected readonly starter = inject(CourseStarterService);
  /**
   * Subdominio de una institución sin landing propia: su portada no cambia con Taps (sin el Tap, sin temas ni «Lleva los
   * Taps a tu grupo»); conserva sus colores y sus cursos. Solo se sabe en el navegador (nginx entrega la shell en subdominios).
   */
  protected readonly institucion = computed(() => !!this.tenant.slug());

  /** Temas jugables (los del banco de Taps; los que aún no tienen Taps no se ofrecen aquí). */
  protected readonly topics = feedTopics(TAPS, TAP_TOPICS).filter(t => !t.soon);
  protected readonly tapCount = TAPS.length;
  protected readonly correo = CORREO_CONTACTO;

  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly courses = signal<IPublicCourse[]>([]);
  protected readonly error = signal<string | null>(null);
  /** Error de la lista de cursos (para el mensaje humano y «Reintentar»). */
  protected readonly loadError = signal<unknown>(null);
  protected readonly errorFor = signal<number | null>(null);
  protected readonly difficulty = DIFFICULTY_LABEL;
  /** Textos del catálogo vacío (lib-empty-state). */
  protected readonly emptyCopy = EMPTY_STATES.public.coursesSoon;

  /** Categoría elegida en la portada («todos» muestra todo). Las fichas solo aparecen si hay cursos en ellas. */
  protected readonly category = signal('todos');
  protected readonly categories = computed(() => {
    const list = this.courses();
    const chips = COURSE_CATEGORIES.map(cat => ({ id: cat.id, label: cat.label, n: list.filter(c => categoryOf(c) === cat.id).length }))
      .filter(c => c.n > 0);
    return chips.length > 1 ? [{ id: 'todos', label: 'Todos', n: list.length }, ...chips] : [];
  });
  protected readonly visibleCourses = computed(() =>
    this.category() === 'todos' ? this.courses() : this.courses().filter(c => categoryOf(c) === this.category()));
  /** Curso a la vista en la fila deslizable del celular (indicador «Curso N de M»). */
  protected readonly cursoActual = signal(0);

  protected elegirCategoria(id: string): void {
    this.category.set(id);
    this.cursoActual.set(0);
    try { document.querySelector('#cursos div.grid')?.scrollTo({ left: 0 }); } catch { /* sin DOM */ }
  }

  protected alDeslizar(e: Event): void {
    const g = e.target as HTMLElement; const card = g.firstElementChild as HTMLElement | null;
    if (!card) return;
    const paso = card.offsetWidth + 14;
    this.cursoActual.set(Math.min(this.visibleCourses().length - 1, Math.round(g.scrollLeft / paso)));
  }

  constructor() {
    // El catálogo vive en el API y cambia sin desplegar: se pide SOLO en el navegador. Si se pidiera en el
    // servidor, el prerender del build hornearía el catálogo (o el error) de la máquina que compila y la
    // hidratación lo reutilizaría desde la caché de transferencia. El HTML prerenderizado lleva el esqueleto.
    afterNextRender(() => this.load());
  }

  protected load(): void {
    this.state.set('loading');
    // Si el API no responde, el esqueleto no se queda para siempre: a los 15 s sale «Reintentar».
    this.catalog.courses().pipe(timeout(15_000)).subscribe({
      next: list => { this.courses.set(list); this.state.set('ready'); },
      error: e => { this.loadError.set(e); this.state.set('error'); },
    });
  }

  protected async start(id: number): Promise<void> {
    this.errorFor.set(null);
    this.choose('cursos');
    const e = await this.starter.start(id);
    this.error.set(e);
    this.errorFor.set(e ? id : null);
  }

  /** Qué puerta abre la gente desde la portada (una medida por toque; GoatCounter cuenta visitantes únicos por path). */
  protected choose(destino: TPortadaDestino): void {
    this.analytics.event(`portada/opcion/${destino}`);
  }

  protected topicEvent(id: string): TPortadaDestino { return `temas/${eventSlug(id)}`; }

  protected readonly copyCrear = COPY_ENTRADA;
  /** Tarjeta «Crea tu personaje y tu Tap» (PR-7): una puerta más de la portada (`portada/opcion/crear`); la llegada la cuenta /crear en `abrir/portada`. */
  protected crear(): void { this.choose('crear'); }
}
