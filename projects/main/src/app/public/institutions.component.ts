import { afterNextRender, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PublicHeaderComponent } from './public-header.component';
import { PublicFooterComponent } from './public-footer.component';
import { IInstitutionRequest, PublicCatalogService } from './public-catalog.service';
import { AnalyticsService } from '../analytics.service';
import { COPY_ENTRADA, eventoEntrada } from '../taps/taps.crear-entrada';
import { IBorradorAdjunto, PARAM_BORRADOR, armarAdjunto, idBorradorValido, mensajeConAdjunto, restaMensaje } from '../taps/taps.crear';
import { VALIDADOR_LOOK_LOADER } from '../taps/taps.look-validador';

/** Clave del borrador del diseñador (guardado.js, `CLAVE_BORRADOR`): se lee aquí sin cargar el diseñador. */
const CLAVE_BORRADOR_DISENADOR = 'taps.disenador.borrador';

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
            <!-- PR-7 del plan del diseñador (§A.2): argumento de venta tangible, con el creador para probarlo sin cuenta. -->
            <li class="perk--crear"><strong>{{ copyCrear.institucionesPerk }}</strong>{{ copyCrear.institucionesDetalle }}
              <a class="btn btn--ghost perk__btn" routerLink="/crear" [queryParams]="{ desde: 'instituciones' }" (click)="probarCreador()">{{ copyCrear.probarCreador }}</a>
            </li>
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
            <!-- PR-8 del plan del diseñador (§A.3.3): llegó desde /crear con un borrador local válido; va adjunto y se puede quitar. -->
            @if (adjunto(); as a) {
              <div class="adjunto" role="status">
                @if (a.miniatura) { <img class="adjunto__mini" [src]="a.miniatura" alt="" width="56" height="74" /> }
                <div class="adjunto__texto">
                  <strong>Tu personaje irá adjunto</strong>
                  <span>Cuando creemos tu espacio lo encontrarás en tu cuenta. Solo viaja el personaje: ningún dato de este navegador.</span>
                  <button type="button" class="adjunto__quitar" (click)="quitarAdjunto()">No adjuntarlo</button>
                </div>
              </div>
            }
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
              <label>¿Qué te gustaría lograr?<textarea class="field" name="msg" rows="3" [attr.maxlength]="maxMensaje()" [(ngModel)]="form.message"></textarea></label>
              @if (error(); as e) { <p class="error" role="alert">{{ e }}</p> }
              <button type="submit" class="btn btn--primary btn--block" [disabled]="busy()">{{ busy() ? 'Enviando…' : 'Enviar solicitud' }}</button>
              <span class="note">Te escribimos en menos de 24 h. Solo usamos estos datos para contactarte sobre GEMS. Ver <a routerLink="/privacidad">privacidad</a>.</span>
            </form>
          }
        </aside>
      </div>
    </main>
    <gems-public-footer />
  `,
  styleUrls: ['./public.scss', './public-detail.scss'],
  styles: `
    .perk__btn { display: flex; width: fit-content; min-height: 44px; margin-top: 10px; }
    .adjunto { display: flex; gap: 12px; align-items: center; margin: 0 0 14px; padding: 12px; border: 1px solid var(--color-borde-principal); border-radius: 14px; background: var(--color-fondo-sutil); color: var(--color-texto-secundario); }
    .adjunto__mini { width: 56px; height: 74px; flex: none; border-radius: 10px; background: #15131f; display: block; }
    .adjunto__texto { display: grid; gap: 4px; font-size: 13px; line-height: 1.35; min-width: 0; }
    .adjunto__texto strong { font-size: 14px; color: var(--color-texto-principal); }
    .adjunto__quitar { justify-self: start; min-height: 32px; padding: 0 4px; font: inherit; font-size: 13px; color: var(--color-texto-acento); background: none; border: 0; text-decoration: underline; cursor: pointer; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstitutionsComponent {
  private readonly catalog = inject(PublicCatalogService);
  private readonly analytics = inject(AnalyticsService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly cargarValidador = inject(VALIDADOR_LOOK_LOADER);
  private readonly route = inject(ActivatedRoute);

  /** Borrador del diseñador adjunto a la solicitud (PR-8, §A.3.3); null si no se llegó con `?borrador=` válido. */
  protected readonly adjunto = signal<IBorradorAdjunto | null>(null);
  /** Lo que cabe en el mensaje: el API corta a 2000 y el bloque del borrador va dentro mientras no haya campo propio (PR-9). */
  protected readonly maxMensaje = signal(restaMensaje(null));
  /** Vino del gancho de /crear (`?desde=crear`): se miden `registro/inicio` y `registro/enviado`. */
  private desdeCrear = false;

  constructor() {
    // El formulario llega prerenderizado y se puede escribir antes de que la página hidrate; al hidratar, ngModel
    // reescribiría los campos con el modelo vacío. Se recoge lo escrito en el DOM antes de que eso pase.
    afterNextRender(() => { this.recuperarEscrito(); void this.adjuntarBorrador(); });
  }

  /**
   * `?borrador=<id>` (viene de «Soy docente o institución» en /crear): si en este navegador hay un borrador con ese id y su look
   * valida con `validarLook`, se muestra «Tu personaje irá adjunto» con la miniatura guardada y el borrador compacto viaja en
   * `message`. Si no existe, es otro o no valida, el formulario funciona normal. Nada de esto toca el prerender.
   */
  private async adjuntarBorrador(): Promise<void> {
    const q = this.route.snapshot.queryParamMap;
    this.desdeCrear = q.get('desde') === 'crear';
    if (this.desdeCrear) this.analytics.event('taps/crear/registro/inicio');
    const id = idBorradorValido(q.get(PARAM_BORRADOR));
    if (!id) return;
    let raw: string | null = null; try { raw = localStorage.getItem(CLAVE_BORRADOR_DISENADOR); } catch { raw = null; }
    if (!raw) return;
    let validar: (look: Record<string, unknown>) => string[];
    try { validar = await this.cargarValidador(); } catch { return; }
    const adjunto = armarAdjunto(raw, id, validar);
    if (!adjunto) return;
    this.adjunto.set(adjunto);
    this.maxMensaje.set(restaMensaje(adjunto.bloque));
    this.cdr.markForCheck();
    // El aviso empuja el formulario: si se vino al ancla #solicitud, que siga a la vista (el gancho llega con ese fragmento).
    if (this.route.snapshot.fragment === 'solicitud') { try { requestAnimationFrame(() => document.getElementById('solicitud')?.scrollIntoView({ block: 'start' })); } catch { /* sin DOM */ } }
  }

  protected quitarAdjunto(): void { this.adjunto.set(null); this.maxMensaje.set(restaMensaje(null)); }

  protected form: IInstitutionRequest = { institutionName: '', contactName: '', email: '', phone: '', role: '', students: null, message: '' };
  /** Rangos en vez de un número exacto: se guarda el tope de cada rango. */
  protected readonly sizes = [
    { label: 'Hasta 10', value: 10 }, { label: '11 a 50', value: 50 }, { label: '51 a 200', value: 200 },
    { label: '201 a 1.000', value: 1000 }, { label: 'Más de 1.000', value: 1001 },
  ];
  protected readonly busy = signal(false);
  protected readonly sent = signal(false);
  protected readonly error = signal<string | null>(null);

  private recuperarEscrito(): void {
    const campos: Record<string, 'institutionName' | 'contactName' | 'role' | 'email' | 'phone' | 'message'> = {
      inst: 'institutionName', contact: 'contactName', role: 'role', email: 'email', phone: 'phone', msg: 'message',
    };
    let hubo = false;
    this.host.nativeElement.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('form.form input[name], form.form textarea[name]').forEach(el => {
      if (el.type === 'radio') {
        if ((el as HTMLInputElement).checked && el.name === 'students') { this.form.students = Number(el.value); hubo = true; }
        return;
      }
      const campo = campos[el.name];
      if (campo && el.value) { this.form[campo] = el.value; hubo = true; }
    });
    if (hubo) this.cdr.markForCheck();
  }

  protected readonly copyCrear = COPY_ENTRADA;
  /** «Probar el creador» (PR-7): el enlace navega a /crear?desde=instituciones; aquí solo se mide. */
  protected probarCreador(): void { this.analytics.event(eventoEntrada('instituciones', 'clic')); }

  protected submit(): void {
    const f = this.form;
    if (!f.institutionName.trim() || !f.contactName.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) {
      this.error.set('Escribe el nombre del espacio, tu nombre y un correo válido.');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    // El borrador va como bloque marcado al final de `message` (el API de hoy no tiene campo para él: PR-9 lo separa).
    const cuerpo: IInstitutionRequest = { ...f, message: mensajeConAdjunto(f.message ?? '', this.adjunto()?.bloque ?? null) };
    this.catalog.requestInstitution(cuerpo).subscribe({
      next: () => {
        this.busy.set(false); this.sent.set(true); this.analytics.event('solicitud-institucion');
        if (this.desdeCrear) this.analytics.event('taps/crear/registro/enviado');
      },
      error: () => { this.busy.set(false); this.error.set('No pudimos enviar la solicitud. Inténtalo de nuevo en unos minutos.'); },
    });
  }
}
