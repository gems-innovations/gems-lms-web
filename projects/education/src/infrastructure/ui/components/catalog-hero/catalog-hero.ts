import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'edu-catalog-hero',
  standalone: true,
  host: { style: 'display:block' },
  templateUrl: './catalog-hero.html',
  styleUrl: './catalog-hero.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogHero {
  readonly totalCount = input<number>(0);
  protected readonly _r = 3;
}
