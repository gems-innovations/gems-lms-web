import { Component, input, computed } from '@angular/core';


@Component({
  selector: 'app-loading-skeleton',
  imports: [],
  templateUrl: './loading-skeleton.html',
  styleUrl: './loading-skeleton.scss'
})
export class LoadingSkeletonComponent {
  rows = input<number>(5);
  type = input<'table' | 'card'>('table');

  rowsArray = computed(() => Array(this.rows()).fill(0));
}
