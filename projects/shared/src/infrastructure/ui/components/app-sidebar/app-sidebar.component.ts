import { Component, computed, ElementRef, inject, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { BrandingService, browserStorage } from 'shared/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AvatarComponent } from '../avatar/avatar.component';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { MobileDrawer } from '../mobile-nav/mobile-drawer';
import { MobileTopbarComponent } from '../mobile-nav/mobile-topbar.component';
import type { NavigationItem, UserProfile } from '../sidebar/sidebar.component';

export type { NavigationItem, UserProfile };

/**
 * Rail de navegación lateral compartido por todas las apps (admin, instructor).
 * Misma estética en toda la plataforma: se colapsa a un icon-rail y persiste
 * el estado por `storageKey` (para que cada app recuerde su propia preferencia).
 */
@Component({
  selector: 'lib-app-sidebar',
  standalone: true,
  imports: [TranslatePipe, RouterLink, RouterLinkActive, AvatarComponent, MobileTopbarComponent],
  host: { '(document:keydown)': 'drawer.onKeydown($event)' },
  templateUrl: './app-sidebar.component.html',
  styleUrl: './app-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppSidebarComponent {
  readonly brandRoute  = input<string>('/');
  readonly brandLabel  = input<string>('GEMS LMS');
  /** Institución del usuario: va como nombre principal y GEMS LMS pasa a «por GEMS LMS». */
  protected readonly institutionName = inject(BrandingService).institutionName;
  readonly menuItems   = input<NavigationItem[]>([]);
  readonly userProfile = input<UserProfile | null>(null);
  /** Destination for the personal account action inside this product area. */
  readonly profileRoute = input<string>('/account/profile');
  /** Clave de localStorage para persistir el colapso (independiente por app). */
  readonly storageKey  = input<string>('gems-app-sidebar-collapsed');

  readonly onLogout = output<void>();

  protected readonly collapsed = signal(false);

  /** En celular el menú es un drawer abierto desde la barra superior. */
  protected readonly drawer = new MobileDrawer(() => this.hostEl.nativeElement, '.app-sidebar');
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    // Lee la preferencia guardada apenas se conoce la storageKey.
    this.collapsed.set(browserStorage.get(this.storageKey()) === '1');
  }

  protected readonly initials = computed(() => {
    const name = this.userProfile()?.name ?? '';
    return name
      .split(' ')
      .filter(Boolean)
      .map(w => w[0]?.toUpperCase())
      .slice(0, 2)
      .join('');
  });

  protected toggle(): void {
    const next = !this.collapsed();
    this.collapsed.set(next);
    browserStorage.set(this.storageKey(), next ? '1' : '0');
  }

  protected handleLogout(): void { this.onLogout.emit(); }
}
