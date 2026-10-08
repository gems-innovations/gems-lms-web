import { afterRenderEffect, Component, ElementRef, inject, input, model } from '@angular/core';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

@Component({
  selector: 'lib-tabs',
  template: `
    <div class="tabs" role="tablist">
      @for (tab of tabs(); track tab.id) {
        <button
          type="button"
          role="tab"
          class="tabs__tab"
          [class.tabs__tab--active]="tab.id === activeId()"
          [attr.aria-selected]="tab.id === activeId()"
          (click)="activeId.set(tab.id)"
        >
          {{ tab.label }}
          @if (tab.count !== undefined) {
            <span class="tabs__count">{{ tab.count }}</span>
          }
        </button>
      }
    </div>
  `,
  styleUrl: './tabs.component.scss'
})
export class TabsComponent {
  readonly tabs = input.required<TabItem[]>();
  readonly activeId = model<string>('');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterRenderEffect(() => {
      this.activeId();
      this.host.nativeElement
        .querySelector('.tabs__tab--active')
        ?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
    });
  }
}
