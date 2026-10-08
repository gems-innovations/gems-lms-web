import { Component } from '@angular/core';

@Component({
  selector: 'lib-stat-grid',
  template: `
    <div class="stat-grid">
      <ng-content />
    </div>
  `,
  styles: `
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: var(--spacing-md);
    }
    @media (max-width: 480px) {
      .stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--spacing-sm); }
    }
  `
})
export class StatGridComponent {}
