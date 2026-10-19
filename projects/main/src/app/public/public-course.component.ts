import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthSessionService, EUserRole } from 'auth/core';
import { PublicHeaderComponent } from './public-header.component';
import { PublicFooterComponent } from './public-footer.component';
import { DIFFICULTY_LABEL, IPublicCourse, PublicCatalogService } from './public-catalog.service';
import { CourseStarterService } from './course-starter.service';
import { InViewDirective } from './in-view.directive';
import { BusyLabelComponent, LoadErrorComponent, SkeletonComponent } from 'shared/loading';

/**
 * Ficha pública de un curso gratis. «Empezar ahora» abre una sesión de invitado (si no hay sesión),
 * inscribe y lleva directo al curso. En el celular el botón queda fijo abajo.
 */
@Component({
  selector: 'gems-public-course',
  imports: [RouterLink, FormsModule, PublicHeaderComponent, PublicFooterComponent, InViewDirective, SkeletonComponent, LoadErrorComponent, BusyLabelComponent],
  template: `
    <gems-public-header />
    <main class="pub">
      <a class="back" routerLink="/" fragment="cursos">← Todos los cursos</a>
      <!-- Carga progresiva: si la portada ya trajo el curso, se pinta al instante y solo el temario espera. -->
      @if (course(); as c) {
            <div class="detail" [attr.aria-busy]="!outlineReady()">
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
                  @if (outlineReady()) {
                    @for (m of c.outline; track m.id; let i = $index) {
                      <div class="outline__mod">
                        <h3>Unidad {{ i + 1 }} · {{ m.title }}</h3>
                        <ol>@for (l of m.lessons; track l.id) { <li>{{ l.title }}</li> }</ol>
                      </div>
                    }
                  } @else if (loadError()) {
                    <lib-load-error compact [error]="loadError()" what="el temario" [retrying]="retrying()" (retry)="load()" />
                  } @else {
                    @for (k of skeletonModules(c); track k) {
                      <div class="outline__mod"><lib-skeleton shape="text" [lines]="4" [label]="k === 0 ? 'Cargando el temario' : null" /></div>
                    }
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
                  <button type="button" class="btn btn--primary btn--block" gemsInView (inView)="startInView.set($event)" [disabled]="busy()" [attr.aria-busy]="busy()" (click)="start()">
                    <lib-busy-label [busy]="busy()" busyText="Entrando…">{{ signedIn() ? 'Ir al curso' : 'Empezar ahora' }}</lib-busy-label>
                  </button>
                  <span class="note">Material educativo de práctica. No pedimos datos personales.
                    <a routerLink="/terminos">Términos</a> · <a routerLink="/privacidad">Privacidad</a></span>
                }
              </aside>
            </div>

            @if (!staff() && !startInView()) {
              <div class="mobile-cta">
                <button type="button" class="btn btn--primary btn--block" [disabled]="busy()" [attr.aria-busy]="busy()" (click)="start()">
                  <lib-busy-label [busy]="busy()" busyText="Entrando…">{{ signedIn() ? 'Ir al curso' : 'Empezar gratis' }}</lib-busy-label>
                </button>
              </div>
            }
      } @else if (loadError()) {
        <lib-load-error [error]="loadError()" what="este curso" [retrying]="retrying()" (retry)="load()"
                        [backLink]="'/'" backLabel="Ver los cursos gratis" />
      } @else {
        <!-- Sin datos aún: esqueleto con la forma exacta de la ficha (título, meta, temario y tarjeta de inicio). -->
        <div class="detail" aria-busy="true">
          <section class="detail__main">
            <lib-skeleton shape="text" [lines]="1" width="110px" label="Cargando el curso" />
            <lib-skeleton shape="title" width="85%" style="margin: 12px 0" />
            <lib-skeleton shape="text" [lines]="2" />
            <lib-skeleton shape="pill" [count]="3" style="display: flex; gap: 6px; margin-top: 14px" />
            <div class="outline">
              @for (k of [0, 1, 2]; track k) { <div class="outline__mod"><lib-skeleton shape="text" [lines]="4" /></div> }
            </div>
          </section>
          <aside class="start">
            <lib-skeleton shape="title" width="70%" />
            <lib-skeleton shape="text" [lines]="2" />
            <lib-skeleton shape="block" height="48px" />
          </aside>
        </div>
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

  /** Lo que ya se sabe del curso: el resumen de la portada (al instante) o el detalle completo. */
  protected readonly course = signal<IPublicCourse | null>(this.catalog.peek(this.id));
  /** El temario está completo (llegó el detalle o el resumen ya lo traía). */
  protected readonly outlineReady = signal(!!this.course()?.outline?.length);
  protected readonly loadError = signal<unknown>(null);
  protected readonly retrying = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = computed(() => this.starter.starting() !== null);
  protected readonly difficulty = DIFFICULTY_LABEL;
  protected nickname = '';
  protected readonly startInView = signal(false);

  protected readonly signedIn = this.session.isAuthenticated;
  protected readonly staff = computed(() => this.signedIn() && this.session.role() !== EUserRole.STUDENT);
  protected readonly roleLabel = computed(() => this.session.role() === EUserRole.INSTRUCTOR ? 'docente' : 'administrador');

  constructor() {
    this.load();
  }

  protected load(): void {
    this.retrying.set(this.loadError() !== null);
    this.catalog.course(this.id).subscribe({
      next: c => { this.course.set(c); this.outlineReady.set(true); this.loadError.set(null); this.retrying.set(false); },
      error: e => { this.loadError.set(e); this.retrying.set(false); },
    });
  }

  /** Cuántas unidades dibujar en el esqueleto del temario (las que dice el resumen, entre 1 y 4). */
  protected skeletonModules(c: IPublicCourse): number[] {
    return Array.from({ length: Math.min(4, Math.max(1, c.modules || 3)) }, (_, i) => i);
  }

  protected async start(): Promise<void> {
    this.error.set(null);
    this.error.set(await this.starter.start(Number(this.id), this.nickname));
  }
}
