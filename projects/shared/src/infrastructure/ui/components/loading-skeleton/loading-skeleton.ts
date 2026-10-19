import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';

/**
 * Esqueleto genérico de tabla o tarjetas (paneles). Espera 300 ms antes de dibujarse: las cargas rápidas no
 * parpadean. Para esqueletos con la forma real del contenido (tarjeta de curso, lección, quiz, gráfico, perfil)
 * usa `lib-skeleton` de `shared/loading`. Ver projects/shared/ESTADOS-DE-CARGA.md.
 */
@Component({
  selector: 'lib-loading-skeleton',
  imports: [],
  templateUrl: './loading-skeleton.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './loading-skeleton.scss'
})
export class LoadingSkeletonComponent {
  rows = input<number>(5);
  type = input<'table' | 'card'>('table');
  /** Lo que se anuncia a lectores de pantalla. */
  label = input<string>('Cargando contenido');

  rowsArray = computed(() => Array(this.rows()).fill(0));
}
