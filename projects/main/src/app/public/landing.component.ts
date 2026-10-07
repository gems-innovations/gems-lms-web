import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicHeaderComponent } from './public-header.component';
import { DIFFICULTY_LABEL, IPublicCourse, PublicCatalogService } from './public-catalog.service';

/**
 * Página de entrada pública: cursos gratis para prepararse para la universidad, sin registro.
 * Las instituciones encuentran arriba el acceso para tener su propio espacio.
 */
@Component({
  selector: 'gems-landing',
  imports: [RouterLink, PublicHeaderComponent],
  templateUrl: './landing.component.html',
  styleUrl: './public.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent {
  private readonly catalog = inject(PublicCatalogService);

  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly courses = signal<IPublicCourse[]>([]);
  protected readonly difficulty = DIFFICULTY_LABEL;

  constructor() {
    this.catalog.courses().subscribe({
      next: list => { this.courses.set(list); this.state.set('ready'); },
      error: () => this.state.set('error'),
    });
  }
}
