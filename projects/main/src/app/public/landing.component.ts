import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { COURSE_CATEGORIES, categoryOf } from './course-categories';
import { RouterLink } from '@angular/router';
import { PublicHeaderComponent } from './public-header.component';
import { PublicFooterComponent } from './public-footer.component';
import { DIFFICULTY_LABEL, IPublicCourse, PublicCatalogService } from './public-catalog.service';
import { CourseStarterService } from './course-starter.service';
import { TiltDirective } from './micro-effects';
import { HeroQuizComponent } from './hero-quiz.component';
import { InViewDirective } from './in-view.directive';

/**
 * Página de entrada pública: cursos gratis para prepararse para la universidad, sin registro.
 * Cada tarjeta abre el curso con un toque; las instituciones encuentran arriba su acceso.
 */
@Component({
  selector: 'gems-landing',
  imports: [RouterLink, PublicHeaderComponent, PublicFooterComponent, HeroQuizComponent, TiltDirective, InViewDirective],
  templateUrl: './landing.component.html',
  styleUrls: ['./public.scss', './landing-extra.scss', './landing-bento.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent {
  private readonly catalog = inject(PublicCatalogService);
  protected readonly starter = inject(CourseStarterService);

  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly courses = signal<IPublicCourse[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly errorFor = signal<number | null>(null);
  protected readonly difficulty = DIFFICULTY_LABEL;
  protected readonly heroCtaInView = signal(false);
  protected readonly gridInView = signal(false);

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

  constructor() {
    this.load();
  }

  protected load(): void {
    this.state.set('loading');
    this.catalog.courses().subscribe({
      next: list => { this.courses.set(list); this.state.set('ready'); },
      error: () => this.state.set('error'),
    });
  }

  /** CTA principal: abre el curso de admisión (el del mini simulacro del hero); si no hay, el primero. */
  protected startFirst(): void {
    const first = this.courses().find(c => categoryOf(c) === 'admision') ?? this.courses()[0];
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
