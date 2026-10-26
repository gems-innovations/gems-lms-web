import { ChangeDetectionStrategy, Component, ElementRef, PLATFORM_ID, afterRenderEffect, inject, signal, viewChildren } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { environment } from 'shared/core';
import { IResumenAdjunto, leerDraft } from '../taps/taps.crear';
import { IRigPintor, RIG_PINTOR_LOADER, pintarMiniatura } from '../taps/taps.look-validador';

interface IRequest {
  id: number; institutionName: string; contactName: string; email: string; phone: string | null;
  role: string | null; students: number | null; message: string | null; status: string; createdAt: string;
  /** Borrador del personaje adjunto (PR-9): JSON canónico como string ya validado por el API, o null. */
  draft?: string | null;
}
/** Una solicitud con su borrador ya leído (null si no trae o no se entiende): se calcula una vez al llegar la lista. */
interface IFila { r: IRequest; personaje: IResumenAdjunto | null }

/** Super admin: instituciones que pidieron su propio espacio desde la página pública. */
@Component({
  selector: 'gems-institution-requests',
  imports: [DatePipe, RouterLink],
  template: `
    <main class="req">
      <a class="req__back" routerLink="/admin/institutions">← Instituciones</a>
      <h1>Solicitudes de instituciones</h1>
      <p class="req__sub">Llegan desde «Registrar mi institución» en la página pública. Contáctalos y crea su institución.</p>
      @switch (state()) {
        @case ('loading') { <p>Cargando…</p> }
        @case ('error') { <p>No se pudieron cargar las solicitudes.</p> }
        @default {
          @if (filas().length === 0) {
            <p class="req__empty">Todavía no hay solicitudes.</p>
          } @else {
            <div class="req__wrap" tabindex="0" role="region" aria-label="Solicitudes">
              <table>
                <thead><tr><th>Fecha</th><th>Institución</th><th>Contacto</th><th>Estudiantes</th><th>Mensaje</th></tr></thead>
                <tbody>
                  @for (f of filas(); track f.r.id) {
                    <tr>
                      <td>{{ f.r.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                      <td><strong>{{ f.r.institutionName }}</strong></td>
                      <td>{{ f.r.contactName }}@if (f.r.role) { · {{ f.r.role }} }<br /><span class="req__muted">{{ f.r.email }}@if (f.r.phone) { · {{ f.r.phone }} }</span></td>
                      <td>{{ f.r.students ?? '—' }}</td>
                      <td class="req__msg">
                        {{ f.r.message || '—' }}
                        <!-- PR-9b del plan del diseñador: el borrador llega en el campo draft (dato de una solicitud pública). Solo texto interpolado y
                             muestras de color ya comprobadas (#rrggbb); la vista previa la pinta rig.js en un lienzo, nunca HTML del dato. -->
                        @if (f.personaje; as p) {
                          <section class="adj" aria-label="Personaje adjunto">
                            <canvas #mini class="adj__mini" width="72" height="96" [attr.data-id]="f.r.id" role="img" [attr.aria-label]="'Vista previa: ' + p.base + ' en ' + p.escenario"></canvas>
                            <div class="adj__texto">
                              <strong>Personaje adjunto</strong>
                              <dl class="adj__datos">
                                <dt>Base</dt><dd>{{ p.base }}</dd>
                                <dt>Objeto</dt><dd>{{ p.objeto }}</dd>
                                <dt>Escenario</dt><dd>{{ p.escenario }}</dd>
                              </dl>
                              @if (p.colores.length) {
                                <ul class="adj__colores" aria-label="Colores">
                                  @for (c of p.colores; track c.nombre) {
                                    <li><span class="adj__muestra" [style.background-color]="c.hex" aria-hidden="true"></span>{{ c.nombre }} <code>{{ c.hex }}</code></li>
                                  }
                                </ul>
                              }
                              <span class="req__muted">Borrador {{ p.adjunto.borradorId }}. Se importará a la cuenta del docente cuando exista.</span>
                            </div>
                          </section>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
      }
    </main>
  `,
  styles: [`
    :host { display: block; min-height: 100%; background: var(--color-fondo-principal); color: var(--color-texto-principal); }
    .req { max-width: 1100px; margin: 0 auto; padding-inline: 20px; padding-block: 28px 60px; }
    .req__back { color: var(--color-texto-secundario); text-decoration: none; font-size: var(--font-size-sm); }
    h1 { margin: 12px 0 6px; font: 800 28px/1.2 var(--font-titulo); }
    .req__sub, .req__muted { color: var(--color-texto-secundario); font-size: var(--font-size-sm); }
    .req__empty { padding: 24px; border-radius: 14px; background: var(--color-superficie); color: var(--color-texto-secundario); }
    .req__wrap { overflow-x: auto; margin-top: 18px; border-radius: 14px; border: 1px solid var(--color-borde-principal); background: var(--color-superficie); }
    table { width: 100%; min-width: 760px; border-collapse: collapse; font-size: var(--font-size-sm); }
    th { text-align: left; padding: 10px 12px; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: var(--color-texto-terciario); background: var(--color-superficie-alta); }
    td { padding: 12px; border-top: 1px solid var(--color-borde-principal); vertical-align: top; }
    .req__msg { max-width: 320px; white-space: pre-line; color: var(--color-texto-secundario); }
    .adj { display: flex; gap: 12px; align-items: flex-start; margin-top: 10px; padding: 10px; border: 1px solid var(--color-borde-principal); border-radius: 12px; background: var(--color-fondo-sutil); white-space: normal; }
    .adj__mini { width: 72px; height: 96px; flex: none; border-radius: 10px; background: #15131f; display: block; }
    .adj__texto { display: grid; gap: 6px; min-width: 0; font-size: 13px; line-height: 1.35; }
    .adj__texto strong { color: var(--color-texto-principal); }
    .adj__datos { display: grid; grid-template-columns: auto 1fr; gap: 2px 8px; margin: 0; }
    .adj__datos dt { color: var(--color-texto-terciario); }
    .adj__datos dd { margin: 0; color: var(--color-texto-principal); }
    .adj__colores { display: flex; flex-wrap: wrap; gap: 6px 12px; margin: 0; padding: 0; list-style: none; }
    .adj__colores li { display: inline-flex; align-items: center; gap: 5px; }
    .adj__colores code { font-size: 11px; color: var(--color-texto-terciario); }
    .adj__muestra { width: 14px; height: 14px; border-radius: 4px; border: 1px solid var(--color-borde-principal); display: inline-block; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstitutionRequestsComponent {
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly filas = signal<IFila[]>([]);
  private readonly minis = viewChildren<ElementRef<HTMLCanvasElement>>('mini');
  private readonly cargarRig = inject(RIG_PINTOR_LOADER);
  private readonly navegador = isPlatformBrowser(inject(PLATFORM_ID));
  /** rig.js cargado (una vez); null mientras llega o si no se pudo: entonces solo hay texto y muestras. */
  private readonly rig = signal<IRigPintor | null>(null);
  private rigPedido = false;
  private readonly pintados = new Set<HTMLCanvasElement>();

  constructor() {
    inject(HttpClient).get<IRequest[]>(`${environment.apiBaseUrl}/institution-requests`).subscribe({
      next: list => { this.filas.set(list.map(r => ({ r, personaje: leerDraft(r.draft) }))); this.state.set('ready'); },
      error: () => this.state.set('error'),
    });
    // Vista previa (opcional): cuando hay lienzos y rig.js, se pinta cada uno una vez. Sin DOM o sin rig, no pasa nada.
    afterRenderEffect(() => {
      const lienzos = this.minis();
      if (!this.navegador || !lienzos.length) return;
      const rig = this.rig();
      if (!rig) { this.pedirRig(); return; }
      const porId = new Map(this.filas().map(f => [String(f.r.id), f.personaje]));
      for (const { nativeElement: c } of lienzos) {
        if (this.pintados.has(c)) continue;
        const p = porId.get(c.dataset['id'] ?? '');
        // Se marca como intentado aunque falle (sin contexto 2D, look que hace lanzar a drawHost): un lienzo no se reintenta en cada render.
        this.pintados.add(c);
        if (p) pintarMiniatura(rig, c, p.adjunto.l, p.adjunto.i, window.devicePixelRatio || 1);
      }
    });
  }

  private pedirRig(): void {
    if (this.rigPedido) return;
    this.rigPedido = true;
    this.cargarRig().then(r => this.rig.set(r)).catch(() => { /* sin vista previa: queda el texto */ });
  }
}
