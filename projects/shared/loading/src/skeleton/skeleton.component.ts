import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Formas del esqueleto. Las compuestas copian la silueta del contenido real para que, al llegar los datos, nada
 * salte de lugar (CLS ≈ 0). Las primitivas sirven para armar un esqueleto a medida dentro del layout real.
 */
export type TSkeletonShape =
  // compuestas
  | 'course-card' | 'table-row' | 'lesson' | 'quiz' | 'chart' | 'profile' | 'stat' | 'list-item'
  // primitivas
  | 'text' | 'title' | 'circle' | 'block' | 'pill';

/**
 * Esqueleto con la forma del contenido. Reserva su espacio desde el primer fotograma, pero se DIBUJA con un
 * retraso de 300 ms (`--sk-delay`): si los datos llegan antes, la persona nunca lo ve parpadear.
 *
 * - Con `label` se anuncia una sola vez a lectores de pantalla («Cargando cursos»); sin él es decorativo.
 * - El contenedor que se está cargando debería llevar `[attr.aria-busy]="cargando()"`.
 * - Sin animación con `prefers-reduced-motion` o `html.reduce-motion` (queda el bloque quieto).
 */
@Component({
  selector: 'lib-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './skeleton.component.html',
  styleUrl: './skeleton.component.scss',
  host: {
    '[class]': '"sk sk--" + shape()',
    '[attr.role]': 'label() ? "status" : null',
    '[attr.aria-hidden]': 'label() ? null : "true"',
    '[style.--sk-cols]': 'columns()',
    '[style.--sk-h]': 'height()',
    '[style.--sk-w]': 'width()',
    '[style.--sk-ratio]': 'aspect()',
  },
})
export class SkeletonComponent {
  readonly shape = input<TSkeletonShape>('text');
  /** Cuántas repeticiones (tarjetas, filas, ítems). */
  readonly count = input(1);
  /** Líneas para `text` (la última queda más corta, como un párrafo real). */
  readonly lines = input(3);
  /** Columnas para `table-row` (iguala la tabla real). */
  readonly columns = input(5);
  /** Alto CSS para `block`, `chart` (p. ej. '240px'). */
  readonly height = input<string | null>(null);
  /** Ancho CSS para primitivas (p. ej. '60%'). */
  readonly width = input<string | null>(null);
  /** Proporción para `block` (p. ej. '16 / 9'): reserva el alto exacto de una imagen o video. */
  readonly aspect = input<string | null>(null);
  /** Texto para lectores de pantalla («Cargando cursos»). Vacío = decorativo (aria-hidden). */
  readonly label = input<string | null>(null);

  protected readonly items = computed(() => Array.from({ length: Math.max(1, this.count()) }, (_, i) => i));
  protected readonly lineItems = computed(() => Array.from({ length: Math.max(1, this.lines()) }, (_, i) => i));
  protected readonly cols = computed(() => Array.from({ length: Math.max(1, this.columns()) }, (_, i) => i));
  /** Alturas fijas (no aleatorias: el prerender y el navegador deben pintar lo mismo). */
  protected readonly bars = [46, 72, 58, 88, 64, 40, 78, 52];
}
