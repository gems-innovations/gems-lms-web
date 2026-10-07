import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { environment } from 'shared/core';

interface IRequest {
  id: number; institutionName: string; contactName: string; email: string; phone: string | null;
  role: string | null; students: number | null; message: string | null; status: string; createdAt: string;
}

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
          @if (items().length === 0) {
            <p class="req__empty">Todavía no hay solicitudes.</p>
          } @else {
            <div class="req__wrap" tabindex="0" role="region" aria-label="Solicitudes">
              <table>
                <thead><tr><th>Fecha</th><th>Institución</th><th>Contacto</th><th>Estudiantes</th><th>Mensaje</th></tr></thead>
                <tbody>
                  @for (r of items(); track r.id) {
                    <tr>
                      <td>{{ r.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                      <td><strong>{{ r.institutionName }}</strong></td>
                      <td>{{ r.contactName }}@if (r.role) { · {{ r.role }} }<br /><span class="req__muted">{{ r.email }}@if (r.phone) { · {{ r.phone }} }</span></td>
                      <td>{{ r.students ?? '—' }}</td>
                      <td class="req__msg">{{ r.message || '—' }}</td>
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
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstitutionRequestsComponent {
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly items = signal<IRequest[]>([]);

  constructor() {
    inject(HttpClient).get<IRequest[]>(`${environment.apiBaseUrl}/institution-requests`).subscribe({
      next: list => { this.items.set(list); this.state.set('ready'); },
      error: () => this.state.set('error'),
    });
  }
}
