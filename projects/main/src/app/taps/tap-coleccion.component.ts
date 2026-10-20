import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IAvanceColeccion, TGrado, casiCorto, gradoTexto } from './taps.coleccion';

/** Colores de cada insignia (metal, borde, cinta). Dibujadas en SVG, sin emojis. */
const METAL: Record<TGrado, { fill: string; edge: string; ribbon: string }> = {
  bronce: { fill: '#c98a4b', edge: '#7a4a1f', ribbon: '#d1343a' },
  plata: { fill: '#d4dbe5', edge: '#7d8796', ribbon: '#3a7bd5' },
  oro: { fill: '#f2c94c', edge: '#9c7414', ribbon: '#2fbf71' },
};

/**
 * Insignia de una colección (mejora 5): medalla con cinta en bronce, plata u oro. Bloqueada: contorno punteado con «???».
 * Decorativa (aria-hidden): quien la usa pone el texto accesible al lado.
 */
@Component({
  selector: 'gems-tap-insignia',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.width]="size()" [attr.height]="size() * 1.15" viewBox="0 0 32 37" aria-hidden="true" [class.is-locked]="!grado()">
      @if (m(); as c) {
        <path d="M9 1h6l-2.5 12h-6ZM17 1h6l2.5 12h-6Z" [attr.fill]="c.ribbon"/>
        <circle cx="16" cy="24" r="11.5" [attr.fill]="c.fill" [attr.stroke]="c.edge" stroke-width="2"/>
        <circle cx="16" cy="24" r="7.5" fill="none" [attr.stroke]="c.edge" stroke-width="1.2" opacity=".55"/>
        <path d="m16 18.6 1.7 3.4 3.8.5-2.8 2.6.7 3.7-3.4-1.8-3.4 1.8.7-3.7-2.8-2.6 3.8-.5Z" [attr.fill]="c.edge"/>
      } @else {
        <path d="M9 1h6l-2.5 12h-6ZM17 1h6l2.5 12h-6Z" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1.4" stroke-linejoin="round"/>
        <circle cx="16" cy="24" r="11.5" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.45)" stroke-width="1.6" stroke-dasharray="3 2.4"/>
        <text x="16" y="27.6" text-anchor="middle" font-size="9" font-weight="800" fill="rgba(255,255,255,.6)" font-family="system-ui, sans-serif">???</text>
      }
    </svg>
  `,
  styles: `:host { display: inline-flex; flex: none; line-height: 0; } svg { overflow: visible; }`,
})
export class TapInsigniaComponent {
  readonly grado = input<TGrado | null>(null);
  readonly size = input(28);
  protected readonly m = computed(() => { const g = this.grado(); return g ? METAL[g] : null; });
}

/**
 * Una colección: insignia, nombre, casillas que se llenan (como las coronas de Preguntados) y el «casi» honesto.
 * - `vista="resultado"`: una sola fila de ~44 px bajo el resultado; tocarla abre todas las colecciones. La casilla recién
 *   ganada se ilumina (< 600 ms; estática con movimiento reducido) y, si la colección ganó insignia o subió de grado, se
 *   dice una vez.
 * - `vista="lista"`: fila de la hoja «Tu día en Taps», con el «casi» completo.
 * Las casillas son una imagen con su descripción (role="img" + aria-label), no una lista de elementos vacíos.
 */
@Component({
  selector: 'gems-tap-coleccion',
  imports: [TapInsigniaComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let a = avance();
    @if (vista() === 'resultado') {
      <button type="button" class="fila" [class.is-nueva]="!!nueva()" (click)="abrir.emit()">
        <gems-tap-insignia [grado]="a.grado" [size]="24" />
        <span class="fila__info">
          <span class="fila__arriba">
            <b>{{ a.col.nombre }}</b>
            <span class="casillas" role="img" [attr.aria-label]="etiqueta()">
              @for (c of a.casillas; track c.tapId) { <i [class.is-on]="c.hecho" [class.is-perfecto]="c.hecho && c.puntaje === c.total" [class.is-recien]="c.tapId === recien()"></i> }
            </span>
            <span class="fila__cuenta">{{ a.hechos }}/{{ a.total }}</span>
          </span>
          @if (nueva(); as g) {
            <span class="fila__nota fila__nota--nueva" role="status">{{ texto(g) }}</span>
          } @else {
            <span class="fila__nota">{{ corto() }}</span>
          }
        </span>
        <svg class="fila__ir" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    } @else {
      <div class="col">
        <gems-tap-insignia [grado]="a.grado" [size]="26" />
        <div class="col__info">
          <p class="col__nombre"><span>{{ a.col.nombre }}</span><span class="col__cuenta">{{ a.hechos }} de {{ a.total }}</span></p>
          <div class="casillas casillas--lista" role="img" [attr.aria-label]="etiqueta()">
            @for (c of a.casillas; track c.tapId) { <i [class.is-on]="c.hecho" [class.is-perfecto]="c.hecho && c.puntaje === c.total"></i> }
          </div>
          @if (a.casi) { <p class="col__nota">{{ a.casi }}</p> }
        </div>
      </div>
    }
  `,
  styles: `
    :host { display: block; }
    .fila { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 44px; padding: 4px 8px 4px 10px; border: 0; border-radius: 12px;
      font: inherit; color: #fff; text-align: left; background: rgba(255, 255, 255, .06); cursor: pointer;
      &.is-nueva { background: rgba(242, 201, 76, .16); } }
    .fila__info { flex: 1; min-width: 0; display: grid; gap: 1px; }
    .fila__arriba { display: flex; align-items: center; gap: 8px; min-width: 0; font-size: 14px;
      b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } }
    .fila__cuenta { margin-left: auto; flex: none; font-size: 13px; font-weight: 700; color: #c8d1de; font-variant-numeric: tabular-nums; }
    .fila__nota { font-size: 12.5px; line-height: 1.25; color: #c8d1de; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .fila__nota--nueva { color: #ffe08a; font-weight: 800; }
    .fila__ir { flex: none; color: #aab4c4; }
    .casillas { display: inline-flex; flex-wrap: wrap; gap: 3px; flex: none;
      i { width: 12px; height: 8px; border-radius: 2px; background: rgba(255, 255, 255, .16); }
      i.is-on { background: #4de1ff; }
      i.is-perfecto { background: #f2c94c; }
      i.is-recien { animation: casilla .55s cubic-bezier(.2, 1.3, .4, 1); } }
    .casillas--lista { display: flex; gap: 4px; i { width: 18px; height: 10px; border-radius: 3px; } }
    .col { display: flex; align-items: center; gap: 10px; padding: 6px 8px; text-align: left; }
    .col__info { flex: 1; min-width: 0; }
    .col__nombre { display: flex; justify-content: space-between; gap: 8px; margin: 0 0 4px; font-size: 14px; font-weight: 800; color: #fff; }
    .col__cuenta { flex: none; font-size: 13px; font-weight: 700; color: #c8d1de; font-variant-numeric: tabular-nums; }
    .col__nota { margin: 4px 0 0; font-size: 13px; line-height: 1.3; color: #c8d1de; }
    button:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
    @keyframes casilla { 0% { transform: scale(.4); background: #fff; } 70% { transform: scale(1.25); } 100% { transform: scale(1); } }
    @media (prefers-reduced-motion: reduce) { .casillas i.is-recien { animation: none; } }
  `,
})
export class TapColeccionComponent {
  readonly avance = input.required<IAvanceColeccion>();
  readonly vista = input<'resultado' | 'lista'>('resultado');
  /** Tap que se acaba de completar: su casilla se ilumina. */
  readonly recien = input<string | null>(null);
  /** Insignia recién ganada (o subida de grado) con este Tap. */
  readonly nueva = input<TGrado | null>(null);
  /** Fila del resultado tocada: abrir todas las colecciones. */
  readonly abrir = output<void>();
  protected texto(g: TGrado): string { return `${gradoTexto(g)}: colección ${this.avance().col.nombre}`; }
  protected corto(): string | null { return casiCorto(this.avance()); }
  protected etiqueta(): string {
    const a = this.avance();
    return `Colección ${a.col.nombre}: ${a.hechos} de ${a.total} Taps${a.grado ? `. ${gradoTexto(a.grado)}` : ''}`;
  }
}
