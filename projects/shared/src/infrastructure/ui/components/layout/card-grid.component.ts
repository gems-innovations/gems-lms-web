import { Component, input } from '@angular/core';

@Component({
  selector: 'lib-card-grid',
  template: `
    <div class="card-grid" [style.--card-min]="minWidth()">
      <ng-content />
    </div>
  `,
  styles: `
    .card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(var(--card-min, 320px), 1fr));
      gap: var(--spacing-lg);
    }
  `
})
export class CardGridComponent {
  readonly minWidth = input<string>('320px');
}
