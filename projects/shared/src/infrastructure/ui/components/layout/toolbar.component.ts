import { Component } from '@angular/core';

@Component({
  selector: 'lib-toolbar',
  template: `
    <div class="toolbar">
      <ng-content />
    </div>
  `,
  styles: `
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--spacing-lg);
      flex-wrap: wrap;
    }
  `
})
export class ToolbarComponent {}
