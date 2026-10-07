import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicHeaderComponent } from './public-header.component';
import { PublicFooterComponent } from './public-footer.component';
import { DIFFICULTY_LABEL, IPublicCourse, PublicCatalogService } from './public-catalog.service';
import { CourseStarterService } from './course-starter.service';
import { TiltDirective } from './micro-effects';
import { HeroQuizComponent } from './hero-quiz.component';

/**
 * Página de entrada pública: cursos gratis para prepararse para la universidad, sin registro.
 * Cada tarjeta abre el curso con un toque; las instituciones encuentran arriba su acceso.
 */
@Component({
  selector: 'gems-landing',
  imports: [RouterLink, PublicHeaderComponent, PublicFooterComponent, HeroQuizComponent, TiltDirective],
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

  constructor() {
    this.catalog.courses().subscribe({
      next: list => { this.courses.set(list); this.state.set('ready'); },
      error: () => this.state.set('error'),
    });
  }

  /** CTA principal: abre el primer curso (o lleva a la lista si aún no cargan). */
  protected startFirst(): void {
    const first = this.courses()[0];
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
