import { signal } from '@angular/core';

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Estado y accesibilidad (Esc, trampa de foco, retorno de foco) del menú lateral
 * cuando se comporta como drawer en celular. Lo comparten lib-sidebar y lib-app-sidebar.
 */
export class MobileDrawer {
  readonly open = signal(false);

  constructor(
    private readonly host: () => HTMLElement,
    private readonly drawerSelector: string,
  ) {}

  toggle(): void {
    if (this.open()) this.close(true);
    else this.show();
  }

  show(): void {
    this.open.set(true);
    setTimeout(() => this.focusables()[0]?.focus(), 60);
  }

  close(restoreFocus = false): void {
    if (!this.open()) return;
    this.open.set(false);
    if (restoreFocus) this.host().querySelector<HTMLElement>('.mtopbar__menu')?.focus();
  }

  /** Cierra el drawer al navegar (click en un enlace o acción del menú). */
  onDrawerClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('a[href], .app-sidebar__signout-btn, .sidebar__logout-btn')) this.close();
  }

  onKeydown(event: KeyboardEvent): void {
    if (!this.open()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close(true);
      return;
    }
    if (event.key !== 'Tab') return;
    const items = this.focusables();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private focusables(): HTMLElement[] {
    const drawer = this.host().querySelector(this.drawerSelector);
    return drawer ? Array.from(drawer.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];
  }
}
