import { Component, computed, input, output } from '@angular/core';
import { ICatalogItem } from '../../../../domain/model/catalog.model';
import { DIFFICULTY_LABELS, formatDuration } from '../../utils/course-labels';

@Component({
  selector: 'edu-catalog-card',
  templateUrl: './catalog-card.html',
  styleUrl: './catalog-card.scss'
})
export class CatalogCard {
  readonly item = input.required<ICatalogItem>();
  readonly enrolled = input<boolean>(false);

  readonly enrollItem = output<ICatalogItem>();
  readonly openItem = output<ICatalogItem>();
  readonly previewItem = output<ICatalogItem>();

  protected readonly difficultyLabel = computed(() => {
    const d = this.item().difficulty;
    return d ? DIFFICULTY_LABELS[d] : '';
  });

  protected readonly duration = computed(() => {
    const min = this.item().duration;
    if (!min) return '—';
    return formatDuration(min);
  });
}
