import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';


@Component({
  selector: 'lib-loading-skeleton',
  imports: [],
  templateUrl: './loading-skeleton.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './loading-skeleton.scss'
})
export class LoadingSkeletonComponent {
  rows = input<number>(5);
  type = input<'table' | 'card'>('table');

  rowsArray = computed(() => Array(this.rows()).fill(0));
}
