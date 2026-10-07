import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthSessionService, EUserRole } from 'auth/core';
import { environment } from 'shared/core';
import { PublicHeaderComponent } from './public-header.component';
import { DIFFICULTY_LABEL, IPublicCourse, PublicCatalogService } from './public-catalog.service';
import { GuestAccessService } from './guest-access.service';

/**
 * Ficha pública de un curso gratis. «Empezar ahora» abre una sesión de invitado (si no hay sesión),
 * inscribe y lleva directo al curso.
 */
@Component({
  selector: 'gems-public-course',
  imports: [RouterLink, FormsModule, PublicHeaderComponent],
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
              <section>
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
                  <p>Sin correo ni contraseña. Tu avance se guarda en este dispositivo y, si quieres, después creas tu cuenta para no perderlo.</p>
                  @if (!signedIn()) {
                    <label for="nick">¿Cómo te llamamos? (opcional)</label>
                    <input id="nick" class="field" maxlength="40" placeholder="Tu nombre o apodo" [(ngModel)]="nickname" (keydown.enter)="start()" />
                  }
                  @if (error(); as e) { <p class="error" role="alert">{{ e }}</p> }
                  <button type="button" class="btn btn--primary btn--block" [disabled]="busy()" (click)="start()">
                    {{ busy() ? 'Entrando…' : signedIn() ? 'Ir al curso' : 'Empezar ahora' }}
                  </button>
                  <span class="note">Al empezar aceptas que guardemos tu progreso para mostrarte tu avance. No pedimos datos personales.</span>
                }
              </aside>
            </div>
          }
        }
      }
    </main>
  `,
  styleUrls: ['./public.scss', './public-detail.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicCourseComponent {
  private readonly catalog = inject(PublicCatalogService);
  private readonly guests = inject(GuestAccessService);
  private readonly session = inject(AuthSessionService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly course = signal<IPublicCourse | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
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
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      const user = await this.guests.ensureSession(this.nickname);
      try {
        await firstValueFrom(this.http.post(`${environment.apiUrls.education.enrollments}`,
          { studentId: Number(user.id), courseId: Number(this.id) }));
      } catch (e) {
        // Ya inscrito: se sigue directo al curso.
        if (!(e instanceof HttpErrorResponse && e.status === 409)) throw e;
      }
      const target = `/learn/courses/${encodeURIComponent(this.id)}`;
      // Respaldo: si la transición animada no puede completarse (pestaña sin pintar), carga directa.
      const fallback = setTimeout(() => { if (typeof location !== 'undefined') location.assign(target); }, 3000);
      await this.router.navigateByUrl(target);
      clearTimeout(fallback);
    } catch (e) {
      this.error.set(e instanceof HttpErrorResponse && e.status === 429
        ? 'Hay demasiadas personas entrando desde esta red. Intenta en unos minutos.'
        : 'No pudimos abrir el curso. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      this.busy.set(false);
    }
  }
}
