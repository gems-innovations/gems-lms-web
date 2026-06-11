import { Component, input } from '@angular/core';

export type PageWidth = 'md' | 'lg' | 'full';

@Component({
  selector: 'lib-page',
  template: `
    <div class="page" [class]="'page--' + width()">
      <ng-content />
    </div>
  `,
  styleUrl: './page.component.scss'
})
export class PageComponent {
  readonly width = input<PageWidth>('lg');
}
