import { Component, computed, ElementRef, input, inject, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { browserStorage } from 'shared/core';
import { MobileDrawer } from '../mobile-nav/mobile-drawer';
import { MobileTopbarComponent } from '../mobile-nav/mobile-topbar.component';

const COLLAPSED_KEY = 'gems-sidebar-collapsed';

export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  badge?: number;
  disabled?: boolean;
}

export interface UserProfile {
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

@Component({
  selector: 'lib-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MobileTopbarComponent],
  templateUrl: './sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.sidebar--collapsed]': 'collapsed()',
    '(document:keydown)': 'drawer.onKeydown($event)',
  },
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  readonly menuItems = input<NavigationItem[]>([]);
  readonly userProfile = input<UserProfile | null>(null);

  public readonly onLogout = output<void>();

  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly drawer = new MobileDrawer(() => this.hostEl.nativeElement, '.sidebar');

  readonly collapsed = signal(browserStorage.get(COLLAPSED_KEY) === '1');

  toggle(): void {
    const next = !this.collapsed();
    this.collapsed.set(next);
    browserStorage.set(COLLAPSED_KEY, next ? '1' : '0');
  }

  protected readonly initials = computed(() => (this.userProfile()?.name ?? '')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join(''));

  handleLogout(): void {
    this.onLogout.emit();
  }
}
