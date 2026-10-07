import { Component, computed, input, output } from '@angular/core';
import { ICatalogItem } from '../../../../domain/model/catalog.model';
import { DIFFICULTY_LABELS } from '../../utils/course-labels';

@Component({
  selector: 'edu-catalog-card',
  templateUrl: './catalog-card.html',
  styleUrl: './catalog-card.scss'
})
export class CatalogCard {
  readonly item = input.required<ICatalogItem>();
  readonly enrolled = input<boolean>(false);
  /** Why the student cannot enroll now (window, seats, prerequisites…); null when they can. */
  readonly blockedReason = input<string | null>(null);
  /** Seats left when the course has a capacity. */
  readonly seatsLeft = input<number | null>(null);

  readonly enrollItem = output<ICatalogItem>();
  readonly openItem = output<ICatalogItem>();
  readonly previewItem = output<ICatalogItem>();

  protected readonly difficultyLabel = computed(() => {
    const d = this.item().difficulty;
    return d ? DIFFICULTY_LABELS[d] : '';
  });
}
