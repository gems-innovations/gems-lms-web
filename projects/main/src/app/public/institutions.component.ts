import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PublicHeaderComponent } from './public-header.component';
import { PublicFooterComponent } from './public-footer.component';
import { IInstitutionRequest, PublicCatalogService } from './public-catalog.service';

/** Para colegios, preuniversitarios y universidades: qué obtienen y solicitud de su propio espacio. */
@Component({
  selector: 'gems-institutions',
  imports: [FormsModule, RouterLink, PublicHeaderComponent, PublicFooterComponent],
  template: `
    <gems-public-header />
    <main class="pub">
      <div class="detail">
        <section>
          <span class="eyebrow">Para instituciones</span>
          <h1>Tus cursos, tus estudiantes y sus resultados, en un solo lugar</h1>
          <p class="lead">La misma plataforma de nuestros cursos gratis, con el espacio propio de tu colegio, preuniversitario o universidad.</p>
          <ul class="perks">
            <li><strong>Tus propios cursos</strong>Crea cursos, evaluaciones con banco de preguntas, tareas con rúbrica y certificados verificables.</li>
            <li><strong>Seguimiento de cada estudiante</strong>Libro de calificaciones, racha, alertas de quién se está quedando atrás y recordatorios con un clic.</li>
            <li><strong>Preparación para la universidad</strong>Tus estudiantes usan nuestros cursos de admisión y tú ves el nivel de cada grupo.</li>
            <li><strong>Gestión académica</strong>Períodos con cierre y actas, carga de estudiantes por CSV, reportes, tu marca y varios idiomas.</li>
          </ul>
        </section>

        <aside class="start" aria-labelledby="req-title">
          @if (sent()) {
            <div class="ok" role="status">
              <h2>¡Recibimos tu solicitud!</h2>
              <p>Te escribimos a {{ form.email }} para crear el espacio de {{ form.institutionName }}.</p>
            </div>
            <a class="btn btn--ghost btn--block" routerLink="/">Volver al inicio</a>
          } @else {
            <h2 id="req-title">Quiero GEMS para mi institución</h2>
            <form class="form" (submit)="$event.preventDefault(); submit()">
              <label>Nombre de la institución *<input class="field" name="inst" required maxlength="160" [(ngModel)]="form.institutionName" /></label>
              <div class="form__row">
                <label>Tu nombre *<input class="field" name="contact" required maxlength="120" [(ngModel)]="form.contactName" /></label>
                <label>Tu cargo<input class="field" name="role" maxlength="60" placeholder="Rector, docente…" [(ngModel)]="form.role" /></label>
              </div>
              <div class="form__row">
                <label>Correo *<input class="field" name="email" type="email" required maxlength="160" [(ngModel)]="form.email" /></label>
                <label>Teléfono<input class="field" name="phone" type="tel" maxlength="40" [(ngModel)]="form.phone" /></label>
              </div>
              <label>¿Cuántos estudiantes tienen?<input class="field" name="students" type="number" min="0" [(ngModel)]="form.students" /></label>
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

  protected form: IInstitutionRequest = { institutionName: '', contactName: '', email: '', phone: '', role: '', students: null, message: '' };
  protected readonly busy = signal(false);
  protected readonly sent = signal(false);
  protected readonly error = signal<string | null>(null);

  protected submit(): void {
    const f = this.form;
    if (!f.institutionName.trim() || !f.contactName.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) {
      this.error.set('Escribe el nombre de la institución, tu nombre y un correo válido.');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.catalog.requestInstitution(f).subscribe({
      next: () => { this.busy.set(false); this.sent.set(true); },
      error: () => { this.busy.set(false); this.error.set('No pudimos enviar la solicitud. Inténtalo de nuevo en unos minutos.'); },
    });
  }
}
