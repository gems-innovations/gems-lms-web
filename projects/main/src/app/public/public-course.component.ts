import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthSessionService, EUserRole } from 'auth/core';
import { PublicHeaderComponent } from './public-header.component';
import { PublicFooterComponent } from './public-footer.component';
import { DIFFICULTY_LABEL, IPublicCourse, PublicCatalogService } from './public-catalog.service';
import { CourseStarterService } from './course-starter.service';

/**
 * Ficha pública de un curso gratis. «Empezar ahora» abre una sesión de invitado (si no hay sesión),
 * inscribe y lleva directo al curso. En el celular el botón queda fijo abajo.
 */
@Component({
  selector: 'gems-public-course',
  imports: [RouterLink, FormsModule, PublicHeaderComponent, PublicFooterComponent],
  template: `
    <gems-public-header />
    <main class="pub">
      <a class="back" routerLink="/" fragment="cursos">← Todos los cursos</a>
      @switch (state()) {
        @case ('loading') { <p class="empty" style="margin-top:24px">Cargando el curso…</p> }
        @case ('error') { <p class="empty" style="margin-top:24px">Este curso no está disponible. <a routerLink="/">Ver los cursos gratis</a></p> }
        @default {
          @if (course(); as c) {
            <div class="detail">
              <section class="detail__main">
                <span class="eyebrow">Curso gratis</span>
                <h1>{{ c.title }}</h1>
                <p class="lead">{{ c.description }}</p>
                <div class="card__meta" style="margin-top:14px">
                  <span>{{ c.modules }} unidades</span><span>{{ c.lessons }} lecciones</span>
                  @if (c.difficulty) { <span>{{ difficulty[c.difficulty] ?? c.difficulty }}</span> }
                  @if (c.instructorName) { <span>{{ c.instructorName }}</span> }
                </div>
                <div class="outline" aria-label="Temario">
                  @for (m of c.outline; track m.id; let i = $index) {
                    <div class="outline__mod">
                      <h3>Unidad {{ i + 1 }} · {{ m.title }}</h3>
                      <ol>@for (l of m.lessons; track l.id) { <li>{{ l.title }}</li> }</ol>
                    </div>
                  }
                </div>
              </section>

              <aside class="start" aria-labelledby="start-title">
                <h2 id="start-title">Empieza ya, gratis</h2>
                @if (staff()) {
                  <p>Estás con una cuenta de {{ roleLabel() }}. Los cursos gratis son para estudiantes: abre esta página en una ventana privada para verlo como ellos.</p>
                } @else {
                  <p>Sin correo ni contraseña. Tu avance se guarda y, si quieres, después creas tu cuenta para no perderlo.</p>
                  @if (!signedIn()) {
                    <label for="nick">¿Cómo te llamamos? (opcional)</label>
                    <input id="nick" class="field" maxlength="40" placeholder="Tu nombre o apodo" autocomplete="nickname"
                           [(ngModel)]="nickname" (keydown.enter)="start()" />
                  }
                  @if (error(); as e) { <p class="error" role="alert">{{ e }}</p> }
                  <button type="button" class="btn btn--primary btn--block" [disabled]="busy()" (click)="start()">
                    {{ busy() ? 'Entrando…' : signedIn() ? 'Ir al curso' : 'Empezar ahora' }}
                  </button>
                  <span class="note">Material de práctica: no garantiza la admisión. No pedimos datos personales.
                    <a routerLink="/terminos">Términos</a> · <a routerLink="/privacidad">Privacidad</a></span>
                }
              </aside>
            </div>

            @if (!staff()) {
              <div class="mobile-cta">
                <button type="button" class="btn btn--primary btn--block" [disabled]="busy()" (click)="start()">
                  {{ busy() ? 'Entrando…' : signedIn() ? 'Ir al curso' : 'Empezar gratis ahora' }}
                </button>
              </div>
            }
          }
        }
      }
    </main>
    <gems-public-footer />
  `,
  styleUrls: ['./public.scss', './public-detail.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicCourseComponent {
  private readonly catalog = inject(PublicCatalogService);
  private readonly starter = inject(CourseStarterService);
  private readonly session = inject(AuthSessionService);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly course = signal<IPublicCourse | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = computed(() => this.starter.starting() !== null);
  protected readonly difficulty = DIFFICULTY_LABEL;
  protected nickname = '';

  protected readonly signedIn = this.session.isAuthenticated;
  protected readonly staff = computed(() => this.signedIn() && this.session.role() !== EUserRole.STUDENT);
  protected readonly roleLabel = computed(() => this.session.role() === EUserRole.INSTRUCTOR ? 'docente' : 'administrador');

  constructor() {
    this.catalog.course(this.id).subscribe({
      next: c => { this.course.set(c); this.state.set('ready'); },
      error: () => this.state.set('error'),
    });
  }

  protected async start(): Promise<void> {
    this.error.set(null);
    this.error.set(await this.starter.start(Number(this.id), this.nickname));
  }
}
