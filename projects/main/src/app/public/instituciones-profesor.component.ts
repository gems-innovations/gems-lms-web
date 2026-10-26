import { ChangeDetectionStrategy, Component, computed, output, signal } from '@angular/core';

interface IEjemplo { id: string; nombre: string; nivel: 'alto' | 'medio'; razones: string[]; avance: number; nota: string; inactivo: string; }

/**
 * Vista del profesor en /instituciones: la alerta temprana del panel real (instructor → risk-panel: «Estudiantes en riesgo»,
 * nivel alto/medio, razones, avance, nota actual, días inactivo y «Enviar recordatorio») con datos de ejemplo que se
 * dicen como tales. Es lo que compra quien paga y la lección de muestra solo enseña la vista del estudiante.
 * Las razones siguen las cuatro señales que nombra el panel real: inactividad, notas bajas, entregas pendientes y avance
 * frente al grupo.
 */
@Component({
  selector: 'gems-instituciones-profesor',
  template: `
    <div class="pv" role="group" aria-label="Vista del profesor con datos de ejemplo">
      <div class="pv__barra">
        <span class="pv__etiqueta">Vista del profesor · datos de ejemplo</span>
        <span class="pv__curso">Curso: Comprensión lectora · 32 estudiantes</span>
      </div>
      <div class="pv__head">
        <h3>Estudiantes en riesgo</h3>
        <p>Señales de alerta temprana: inactividad, notas bajas, entregas que la mayoría ya hizo y avance frente al grupo.</p>
        <div class="pv__filtros" role="group" aria-label="Filtrar por nivel de riesgo">
          @for (f of filtros; track f.id) {
            <button type="button" [class.on]="filtro() === f.id" [attr.aria-pressed]="filtro() === f.id" (click)="filtro.set(f.id)">{{ f.label }} <b>{{ cuantos(f.id) }}</b></button>
          }
        </div>
      </div>
      <ul class="pv__lista">
        @for (e of visibles(); track e.id) {
          <li class="pv__card" [attr.data-nivel]="e.nivel">
            <div class="pv__quien">
              <span class="pv__avatar" aria-hidden="true">{{ e.nombre[0] }}</span>
              <strong>{{ e.nombre }}</strong>
              <span class="pv__nivel">Riesgo {{ e.nivel }}</span>
            </div>
            <ul class="pv__razones">@for (r of e.razones; track r) { <li>{{ r }}</li> }</ul>
            <dl class="pv__datos">
              <div><dt>Avance</dt><dd>{{ e.avance }}%</dd></div>
              <div><dt>Nota actual</dt><dd>{{ e.nota }}</dd></div>
              <div><dt>Inactivo</dt><dd>{{ e.inactivo }}</dd></div>
            </dl>
            @if (enviado() === e.id) {
              <p class="pv__ok" role="status">En tu espacio, el recordatorio le llega a {{ e.nombre.split(' ')[0] }} dentro de la plataforma. Aquí es solo un ejemplo: no se envía nada.</p>
            } @else {
              <button type="button" class="pv__btn" (click)="recordar(e.id)">Enviar recordatorio</button>
            }
          </li>
        }
      </ul>
    </div>
  `,
  styles: `
    :host { display: block; }
    .pv { border-radius: 20px; overflow: hidden; background: var(--color-superficie); border: 1px solid var(--color-borde-secundario); box-shadow: var(--sombra-lg); }
    .pv__barra { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px 16px; padding: 10px 18px; font-size: var(--font-size-sm);
      background: var(--color-fondo-sutil); border-bottom: 1px solid var(--color-borde-principal); color: var(--color-texto-secundario); }
    .pv__etiqueta { font: 700 var(--texto-etiqueta)/1.4 var(--font-texto); text-transform: uppercase; letter-spacing: var(--tracking-etiqueta); color: var(--color-texto-acento); }
    .pv__head { padding: 18px 18px 6px; display: grid; gap: 6px;
      h3 { margin: 0; font: 700 var(--texto-titulo-3)/1.25 var(--font-titulo); }
      p { margin: 0; font-size: var(--font-size-sm); color: var(--color-texto-secundario); } }
    .pv__filtros { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px;
      button { min-height: 44px; padding: 0 14px; border-radius: 99px; cursor: pointer; font: 600 var(--font-size-sm)/1 var(--font-texto);
        color: var(--color-texto-secundario); background: transparent; border: 1px solid var(--color-borde-secundario);
        &:hover { border-color: var(--color-primario); }
        &:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; } }
      button.on { color: var(--color-texto-principal); border-color: var(--color-primario); background: color-mix(in srgb, var(--color-primario) 14%, transparent); }
      b { margin-left: 4px; } }
    .pv__lista { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); gap: 12px; margin: 0; padding: 12px 18px 18px; list-style: none; }
    .pv__card { display: grid; gap: 10px; align-content: start; padding: 16px; border-radius: 14px; background: var(--color-fondo-sutil);
      border: 1px solid var(--color-borde-principal); border-left: 4px solid var(--nivel); --nivel: var(--color-error);
      &[data-nivel='medio'] { --nivel: var(--color-advertencia, #e0a030); } }
    .pv__quien { display: flex; align-items: center; gap: 10px; strong { flex: 1; min-width: 0; } }
    .pv__avatar { display: grid; place-items: center; width: 36px; height: 36px; flex: none; border-radius: 50%; font-weight: 800;
      color: var(--color-sobre-primario); background: var(--color-primario-accion); }
    .pv__nivel { font-size: var(--font-size-xs, 12px); font-weight: 700; padding: 4px 10px; border-radius: 99px; color: var(--color-texto-principal);
      background: color-mix(in srgb, var(--nivel) 22%, transparent); }
    .pv__razones { margin: 0; padding-left: 18px; display: grid; gap: 4px; font-size: var(--font-size-sm); color: var(--color-texto-secundario); }
    .pv__datos { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin: 0;
      div { padding: 8px; border-radius: 10px; background: var(--color-superficie); text-align: center; }
      dt { font-size: var(--font-size-xs, 12px); color: var(--color-texto-secundario); } dd { margin: 2px 0 0; font-weight: 800; color: var(--color-texto-principal); } }
    .pv__btn { justify-self: start; min-height: 44px; padding: 0 16px; border-radius: var(--radio-control); cursor: pointer; font: 700 var(--font-size-sm)/1 var(--font-texto);
      color: var(--color-texto-acento); background: transparent; border: 1px solid var(--color-primario);
      &:hover { background: color-mix(in srgb, var(--color-primario) 12%, transparent); }
      &:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; } }
    .pv__ok { margin: 0; padding: 10px 12px; border-radius: 10px; font-size: var(--font-size-sm); color: var(--color-texto-principal);
      background: color-mix(in srgb, var(--color-exito) 14%, transparent); border: 1px solid color-mix(in srgb, var(--color-exito) 40%, transparent); }
    // Celular: la explicación ya está en el texto de la sección y las tarjetas van en una fila que se desliza (como los cursos de la portada).
    @media (max-width: 599px) {
      .pv__head > p { display: none; }
      .pv__lista { display: flex; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory; overscroll-behavior-x: contain; padding: 12px 14px 16px; scroll-padding-inline: 14px; }
      .pv__card { flex: 0 0 88%; scroll-snap-align: start; }
      .pv__card:only-child { flex-basis: 100%; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstitucionesProfesorComponent {
  /** Toque a «Enviar recordatorio» (se mide como `instituciones/profesor/recordar`). */
  readonly recordatorio = output<void>();
  protected readonly enviado = signal<string | null>(null);

  protected readonly ejemplos: IEjemplo[] = [
    { id: 'a', nombre: 'Laura Gómez', nivel: 'alto', avance: 12, nota: '2,4', inactivo: '9 días',
      razones: ['Lleva 9 días sin entrar al curso', 'Le faltan 2 entregas que la mayoría ya hizo'] },
    { id: 'b', nombre: 'Andrés Ríos', nivel: 'medio', avance: 38, nota: '3,1', inactivo: '4 días',
      razones: ['Va en el 38 % del curso; el grupo va en el 61 %', 'Nota baja en la última evaluación'] },
  ];

  protected readonly filtros = [{ id: 'todos', label: 'Todos' }, { id: 'alto', label: 'Alto' }, { id: 'medio', label: 'Medio' }] as const;
  protected readonly filtro = signal<'todos' | 'alto' | 'medio'>('todos');
  protected readonly visibles = computed(() => this.filtro() === 'todos' ? this.ejemplos : this.ejemplos.filter(e => e.nivel === this.filtro()));
  protected cuantos(id: 'todos' | 'alto' | 'medio'): number { return id === 'todos' ? this.ejemplos.length : this.ejemplos.filter(e => e.nivel === id).length; }

  protected recordar(id: string): void { this.enviado.set(id); this.recordatorio.emit(); }
}
