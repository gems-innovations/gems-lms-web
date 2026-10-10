import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PublicHeaderComponent } from './public-header.component';
import { PublicFooterComponent } from './public-footer.component';
import { IInstitutionRequest, PublicCatalogService } from './public-catalog.service';
import { AnalyticsService } from '../analytics.service';

/** Para colegios, preuniversitarios y universidades: qué obtienen y solicitud de su propio espacio. */
@Component({
  selector: 'gems-institutions',
  imports: [FormsModule, RouterLink, PublicHeaderComponent, PublicFooterComponent],
  template: `
    <gems-public-header />
    <main class="pub">
      <!-- Quien llega aquí buscando los cursos gratis o su cuenta de siempre, encuentra su salida de inmediato. -->
      <nav class="switch" aria-label="¿Buscas otra cosa?">
        <a routerLink="/" fragment="cursos"><strong>¿Buscas los cursos gratis?</strong> <span class="switch__hint">Son de GEMS y no piden cuenta.</span></a>
        <a routerLink="/auth/signin"><strong>¿Tu institución ya está en GEMS?</strong> <span class="switch__hint">Entra con la cuenta que te dieron.</span></a>
      </nav>
      <div class="detail">
        <section>
          <span class="eyebrow">GEMS para tu institución</span>
          <h1>Tu propio espacio para enseñar, del tamaño que necesites</h1>
          <p class="lead">Los cursos gratis son los de GEMS. Tu espacio es aparte y es tuyo: tus cursos, tus integrantes y el avance de cada uno, en la misma plataforma.</p>
          <a class="btn btn--primary lead-cta" href="#solicitud">Pedir mi espacio</a>
          <ul class="who" aria-label="Para quién es">
            <li>Colegios</li><li>Universidades</li><li>Preuniversitarios y academias</li><li>Empresas</li><li>Profesores independientes</li><li>Comunidades y grupos de estudio</li>
          </ul>
          <ul class="perks">
            <li><strong>Tus propios cursos</strong>Crea cursos, evaluaciones con banco de preguntas, tareas con rúbrica y certificados verificables.</li>
            <li><strong>Seguimiento de cada estudiante</strong>Libro de calificaciones, racha, alertas de quién se está quedando atrás y recordatorios con un clic.</li>
            <li><strong>Para cualquier tema</strong>Admisión, idiomas, programación, finanzas, música, tu club de lectura: tú decides qué se aprende.</li>
            <li><strong>Gestión académica</strong>Períodos con cierre y actas, carga de estudiantes por CSV, reportes, tu marca y varios idiomas.</li>
          </ul>
        </section>

        <aside class="start" id="solicitud" aria-labelledby="req-title">
          @if (sent()) {
            <div class="ok" role="status">
              <h2>¡Recibimos tu solicitud!</h2>
              <p>Te escribimos a {{ form.email }} para crear el espacio de {{ form.institutionName }}.</p>
            </div>
            <a class="btn btn--ghost btn--block" routerLink="/">Volver al inicio</a>
          } @else {
            <h2 id="req-title">Quiero mi espacio en GEMS</h2>
            <form class="form" (submit)="$event.preventDefault(); submit()">
              <label>Nombre de tu institución, empresa o grupo *<input class="field" name="inst" required maxlength="160" autocomplete="organization" enterkeyhint="next" [(ngModel)]="form.institutionName" /></label>
              <div class="form__row">
                <label>Tu nombre *<input class="field" name="contact" required maxlength="120" autocomplete="name" enterkeyhint="next" [(ngModel)]="form.contactName" /></label>
                <label>Tu cargo<input class="field" name="role" maxlength="60" autocomplete="organization-title" enterkeyhint="next" placeholder="Ej.: docente, líder" [(ngModel)]="form.role" /></label>
              </div>
              <div class="form__row">
                <label>Correo *<input class="field" name="email" type="email" inputmode="email" autocomplete="email" enterkeyhint="next" required maxlength="160" [(ngModel)]="form.email" /></label>
                <label>Teléfono<input class="field" name="phone" type="tel" autocomplete="tel" enterkeyhint="next" maxlength="40" [(ngModel)]="form.phone" /></label>
              </div>
              <fieldset class="pick">
                <legend>¿Cuántas personas aprenderían?</legend>
                <div class="pick__opts">
                  @for (o of sizes; track o.value) {
                    <label class="pick__opt" [class.is-on]="form.students === o.value">
                      <input type="radio" name="students" [value]="o.value" [checked]="form.students === o.value" (change)="form.students = o.value" />
                      <span>{{ o.label }}</span>
                    </label>
                  }
                </div>
              </fieldset>
              <label>¿Qué te gustaría lograr?<textarea class="field" name="msg" rows="3" maxlength="2000" [(ngModel)]="form.message"></textarea></label>
              @if (error(); as e) { <p class="error" role="alert">{{ e }}</p> }
              <button type="submit" class="btn btn--primary btn--block" [disabled]="busy()">{{ busy() ? 'Enviando…' : 'Enviar solicitud' }}</button>
              <span class="note">Solo usamos estos datos para contactarte sobre GEMS. Ver <a routerLink="/privacidad">privacidad</a>.</span>
            </form>
          }
        </aside>
      </div>
    </main>
    <gems-public-footer />
  `,
  styleUrls: ['./public.scss', './public-detail.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstitutionsComponent {
  private readonly catalog = inject(PublicCatalogService);
  private readonly analytics = inject(AnalyticsService);

  protected form: IInstitutionRequest = { institutionName: '', contactName: '', email: '', phone: '', role: '', students: null, message: '' };
  /** Rangos en vez de un número exacto: se guarda el tope de cada rango. */
  protected readonly sizes = [
    { label: 'Hasta 10', value: 10 }, { label: '11 a 50', value: 50 }, { label: '51 a 200', value: 200 },
    { label: '201 a 1.000', value: 1000 }, { label: 'Más de 1.000', value: 1001 },
  ];
  protected readonly busy = signal(false);
  protected readonly sent = signal(false);
  protected readonly error = signal<string | null>(null);

  protected submit(): void {
    const f = this.form;
    if (!f.institutionName.trim() || !f.contactName.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) {
      this.error.set('Escribe el nombre del espacio, tu nombre y un correo válido.');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.catalog.requestInstitution(f).subscribe({
      next: () => { this.busy.set(false); this.sent.set(true); this.analytics.event('solicitud-institucion'); },
      error: () => { this.busy.set(false); this.error.set('No pudimos enviar la solicitud. Inténtalo de nuevo en unos minutos.'); },
    });
  }
}
