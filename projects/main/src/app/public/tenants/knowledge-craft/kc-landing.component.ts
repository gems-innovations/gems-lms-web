import { afterNextRender, ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthSessionService } from 'auth/core';
import { COURSE_CATEGORIES, categoryOf } from '../../course-categories';
import { CourseStarterService } from '../../course-starter.service';
import { isGuestUser } from '../../guest-access.service';
import { DIFFICULTY_LABEL } from '../../public-catalog.service';
import { TenantService } from '../../../tenant.service';
import { InViewDirective } from '../../in-view.directive';
import { TapsFeedComponent } from '../../../taps/taps-feed.component';
import { TAP_TOPICS, TAPS } from '../../../taps/taps.data';
import { feedTopics } from '../../../taps/taps.logic';

/**
 * Landing de Knowledge Craft (el canal de Minecraft): misma función que la portada de GEMS (un Tap jugable de Minecraft
 * en el primer pantallazo, temas, cursos gratis sin registro, preguntas frecuentes) con la identidad del canal: pixel art,
 * fondo oscuro, cian, verde y oro, tipografías Press Start 2P y Rubik.
 */
@Component({
  selector: 'kc-landing',
  imports: [RouterLink, TapsFeedComponent, InViewDirective],
  templateUrl: './kc-landing.component.html',
  styleUrls: ['./kc-landing.component.scss', './kc-landing-sections.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KcLandingComponent {
  private readonly tenant = inject(TenantService);
  private readonly session = inject(AuthSessionService);
  protected readonly starter = inject(CourseStarterService);

  /** Cursos públicos de esta institución (los que se le asignaron), ya cargados con la marca. */
  protected readonly courses = this.tenant.courses;
  protected readonly error = signal<string | null>(null);
  protected readonly errorFor = signal<number | null>(null);
  protected readonly difficulty = DIFFICULTY_LABEL;
  /** Temas jugables de Taps (Minecraft primero, como en el catálogo); cada uno abre /taps?tema=<id>. */
  protected readonly topics = feedTopics(TAPS, TAP_TOPICS).filter(t => !t.soon);
  /** Mientras el hero (con el Tap) se ve, no aparece la barra fija de «Empezar gratis»: taparía las opciones en celular. */
  protected readonly heroInView = signal(false);
  protected readonly gridInView = signal(false);
  protected readonly category = signal('todos');

  /** true cuando ya corre en el navegador y la sesión guardada está leída (en el servidor no hay sesión). */
  protected readonly ready = signal(false);
  protected readonly signedIn = this.session.isAuthenticated;
  protected readonly guest = computed(() => isGuestUser(this.session.user()));
  protected readonly home = computed(() => this.guest() ? '/learn/my-learning' : this.session.getHomeRoute());

  private readonly sorted = computed(() =>
    [...this.courses()]);
  protected readonly categories = computed(() => {
    const list = this.courses();
    const chips = COURSE_CATEGORIES.map(cat => ({ id: cat.id, label: cat.label, n: list.filter(c => categoryOf(c) === cat.id).length }))
      .filter(c => c.n > 0);
    return chips.length > 1 ? [{ id: 'todos', label: 'Todos', n: list.length }, ...chips] : [];
  });
  protected readonly visibleCourses = computed(() =>
    this.category() === 'todos' ? this.sorted() : this.sorted().filter(c => categoryOf(c) === this.category()));

  protected readonly week = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  constructor() {
    afterNextRender(() => this.ready.set(true));
  }

  /** CTA principal: abre el primer curso (el de Minecraft si existe); si aún no cargan, baja a la lista. */
  protected startFirst(): void {
    const first = this.sorted()[0];
    if (first) void this.start(first.id);
    else document.getElementById('cursos')?.scrollIntoView({ behavior: 'smooth' });
  }

  protected async start(id: number): Promise<void> {
    this.errorFor.set(null);
    const e = await this.starter.start(id);
    this.error.set(e);
    this.errorFor.set(e ? id : null);
  }
}
