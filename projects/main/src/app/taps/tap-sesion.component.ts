import {
  ChangeDetectionStrategy, Component, ElementRef, afterNextRender, input, output, viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { IResumenSesion, goalLabel, sessionLabel, streakLabel } from './taps.sesion';

/** Llama dibujada (sin emojis): racha. Apagada (contorno) si hoy aún no cuenta. */
const LLAMA = 'M12 2.5c.9 3.2 4.6 5.2 4.6 9.9a4.6 4.6 0 0 1-9.2 0c0-2.1 1-3.6 2.1-4.6.3 1.7 1 2.7 2 3.1-.1-3.3-.8-5.8.5-8.4Z';

export interface ITemaAvance { nombre: string; hechos: number; total: number; color: string }

/**
 * Progreso de la sesión (auditoria-permanencia.md, mejora 1): racha, meta de 3 Taps al día y avance del tema.
 * - `chip`: en la barra del celular, junto al logo, en lugar del nombre de la marca («2 · Hoy 1/3»). Entre 360 y 399 px queda
 *   «2 · 1/3» y por debajo de 360 px solo la llama y el número.
 * - `franja`: arriba del resultado de cada Tap, con el avance del tema («Minecraft 5 de 23»).
 * Al cumplir la meta se celebra una vez («Meta de hoy lista») y no se pide nada más: el feed sigue igual, sin presión.
 * Nunca se dice nada de perder la racha. Para lectores de pantalla, la frase completa va en texto visualmente oculto (lo
 * visible se marca aria-hidden): sin aria-label en elementos sin rol.
 */
@Component({
  selector: 'gems-tap-sesion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let r = resumen();
    @if (vista() === 'chip') {
      <span class="chip">
        <span class="oculto">{{ etiqueta() }}</span>
        <svg class="llama" [class.is-off]="!r.rachaHoy" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path [attr.d]="llama"/></svg>
        <b aria-hidden="true">{{ r.racha }}</b>
        <span class="chip__hoy" aria-hidden="true"><span class="chip__palabra">Hoy </span>{{ hoy() }}/{{ r.meta.meta }}</span>
      </span>
    } @else {
      <div class="franja" [class.is-meta]="celebrar()" role="group" aria-label="Tu progreso de hoy">
        <span class="franja__item">
          <svg class="llama" [class.is-off]="!r.rachaHoy" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path [attr.d]="llama"/></svg>
          <span aria-hidden="true">Racha {{ r.racha }}</span><span class="oculto">{{ racha() }}.</span>
        </span>
        <span class="franja__item">
          <span class="puntos" aria-hidden="true">
            @for (k of [0, 1, 2]; track k) { <i [class.is-on]="k < r.meta.hechos"></i> }
          </span>
          <span aria-hidden="true">{{ celebrar() ? 'Meta de hoy lista' : 'Hoy ' + hoy() + '/' + r.meta.meta }}</span><span class="oculto">{{ meta() }}.</span>
        </span>
        @if (tema(); as t) {
          <span class="franja__item franja__tema" [style.--c]="t.color">
            <i class="tema__punto" aria-hidden="true"></i>{{ t.nombre }} {{ t.hechos }} de {{ t.total }}
          </span>
        }
      </div>
    }
  `,
  styles: `
    :host { display: contents; }
    .oculto { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
    .llama { flex: none; fill: #ffb547; filter: drop-shadow(0 1px 1px rgba(0, 0, 0, .4));
      &.is-off { fill: none; stroke: #ffb547; stroke-width: 2; } }
    .chip { display: inline-flex; align-items: center; gap: 3px; font-size: 13px; font-weight: 800; font-variant-numeric: tabular-nums; color: #fff;
      text-shadow: 0 1px 2px rgba(0, 0, 0, .6); white-space: nowrap;
      b { font-weight: 800; } }
    .chip__hoy { margin-left: 4px; padding: 2px 7px; border-radius: 999px; background: rgba(8, 10, 14, .45); border: 1px solid rgba(255, 255, 255, .2); text-shadow: none; }
    /* El logo de 28 px se queda siempre: 360-399 px, la píldora sin la palabra («1/3»); < 360 px, solo llama y número. */
    @media (max-width: 399px) { .chip__palabra { display: none; } }
    @media (max-width: 359px) { .chip__hoy { display: none; } }
    .franja { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px 14px; margin: 0 0 10px; padding: 7px 10px; border-radius: 14px;
      font-size: 14px; font-weight: 700; color: #dfe6ef; background: rgba(255, 255, 255, .06); font-variant-numeric: tabular-nums; }
    .franja__item { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
    .puntos { display: inline-flex; gap: 3px;
      i { width: 9px; height: 9px; border-radius: 50%; border: 1.5px solid #4de1ff; }
      i.is-on { background: #4de1ff; } }
    .tema__punto { width: 9px; height: 9px; border-radius: 3px; background: var(--c, #8b93a7); }
    .franja.is-meta { color: #fff; background: rgba(77, 225, 255, .16); animation: meta-pop .5s cubic-bezier(.2, 1.3, .4, 1); }
    @keyframes meta-pop { 0% { transform: scale(.94); } 60% { transform: scale(1.03); } 100% { transform: scale(1); } }
    @media (prefers-reduced-motion: reduce) { .franja.is-meta { animation: none; } }
  `,
})
export class TapSesionComponent {
  readonly resumen = input.required<IResumenSesion>();
  readonly vista = input<'chip' | 'franja'>('chip');
  readonly tema = input<ITemaAvance | null>(null);
  /** Este resultado cumplió la meta del día (se celebra una sola vez). */
  readonly celebrar = input(false);
  protected readonly llama = LLAMA;

  /** Taps de hoy contra la meta: pasada la meta se muestra 3/3 (no «4/3»). */
  protected hoy(): number { return Math.min(this.resumen().meta.hechos, this.resumen().meta.meta); }
  protected etiqueta(): string { return sessionLabel(this.resumen()); }
  protected racha(): string { return streakLabel(this.resumen()); }
  protected meta(): string { return goalLabel(this.resumen()); }
}

/**
 * Hoja «Tu día en Taps» que abre el logo de la barra en el celular (antes el logo sacaba del juego a la portada con un toque
 * de más: hallazgo 5). Resume racha, meta y avance por tema; «Seguir jugando» cierra y la portada queda a un toque más,
 * sin «¿seguro que te vas?».
 */
@Component({
  selector: 'gems-tap-sesion-hoja',
  imports: [RouterLink, TapSesionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog class="hoja" #hoja (close)="cerrar.emit()" (click)="$event.target === hoja && hoja.close()" aria-labelledby="taps-hoja-dia">
      <div class="hoja__body">
        <h2 id="taps-hoja-dia" class="hoja__title">Tu día en Taps</h2>
        <gems-tap-sesion vista="franja" [resumen]="resumen()" />
        <p class="hoja__nota">{{ nota() }}</p>
        @if (temas().length) {
          <ul class="hoja__temas">
            @for (t of temas(); track t.nombre) {
              <li [style.--c]="t.color">
                <span class="hoja__nombre"><i aria-hidden="true"></i>{{ t.nombre }}</span>
                <span class="hoja__barra" aria-hidden="true"><b [style.width.%]="t.total ? (t.hechos / t.total) * 100 : 0"></b></span>
                <span class="hoja__cuenta">{{ t.hechos }} de {{ t.total }}</span>
              </li>
            }
          </ul>
        }
        <p class="hoja__solo">Se guarda solo en este navegador.</p>
        <button type="button" class="hoja__seguir" (click)="hoja.close()">Seguir jugando</button>
        <a class="hoja__portada" routerLink="/">Ir a la portada de GEMS LMS</a>
      </div>
    </dialog>
  `,
  styles: `
    :host { --safe-b: max(12px, calc(env(safe-area-inset-bottom) + 8px)); font-family: var(--font-texto, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif); }
    .hoja { width: 100%; max-width: 480px; margin: auto auto 0; padding: 0; border: 0; border-radius: 22px 22px 0 0; color: #fff; background: #161b24;
      &::backdrop { background: rgba(0, 0, 0, .55); }
      &[open] { animation: hoja-in .26s cubic-bezier(.2, 1.1, .4, 1); } }
    .hoja__body { padding: 16px 16px var(--safe-b); }
    .hoja__title { margin: 0 0 12px; font-size: 18px; }
    .hoja__nota { margin: 0 0 12px; font-size: 15px; line-height: 1.4; color: #c8d1de; }
    .hoja__temas { display: grid; gap: 10px; margin: 0 0 10px; padding: 0; list-style: none;
      li { display: grid; grid-template-columns: 1fr auto; gap: 4px 10px; align-items: center; } }
    .hoja__nombre { display: inline-flex; align-items: center; gap: 8px; font-weight: 800;
      i { width: 12px; height: 12px; border-radius: 4px; background: var(--c); } }
    .hoja__cuenta { font-size: 13px; font-weight: 700; color: #c8d1de; font-variant-numeric: tabular-nums; }
    .hoja__barra { grid-column: 1 / -1; height: 6px; border-radius: 999px; background: rgba(255, 255, 255, .1); overflow: hidden;
      b { display: block; height: 100%; border-radius: inherit; background: var(--c); } }
    .hoja__solo { margin: 0 0 12px; font-size: 12px; color: #aab4c4; }
    .hoja__seguir, .hoja__portada { display: flex; align-items: center; justify-content: center; width: 100%; min-height: 48px; border-radius: 14px; font: inherit; font-weight: 800; }
    .hoja__seguir { border: 0; color: #10141b; background: #f3f5f8; cursor: pointer; }
    .hoja__portada { margin-top: 8px; color: #c8d1de; text-decoration: none; font-weight: 700; }
    a:focus-visible, button:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
    @keyframes hoja-in { from { transform: translateY(100%); } }
    @media (prefers-reduced-motion: reduce) { .hoja[open] { animation: none; } }
  `,
})
export class TapSesionHojaComponent {
  readonly resumen = input.required<IResumenSesion>();
  readonly temas = input<ITemaAvance[]>([]);
  readonly cerrar = output<void>();
  private readonly hoja = viewChild.required<ElementRef<HTMLDialogElement>>('hoja');

  constructor() {
    afterNextRender(() => { const d = this.hoja().nativeElement; if (!d.open) d.showModal?.(); });
  }

  /** Nota sin presión: la meta es una invitación y 1 Tap ya cuenta para la racha. */
  protected nota(): string {
    const r = this.resumen();
    if (r.meta.cumplida) return 'Meta de hoy lista. Lo que juegues ahora es por gusto.';
    if (r.meta.hechos === 0) {
      return r.racha > 0 ? `${streakLabel(r)}. Hoy hay Taps nuevos. La meta de hoy: 3 Taps.` : 'La meta de hoy: 3 Taps. 1 Tap ya cuenta para la racha.';
    }
    return `Llevas ${r.meta.hechos} de ${r.meta.meta} Taps hoy. La meta de hoy: 3 Taps.`;
  }
}
