import { Component, Input, output, signal, HostBinding, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

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
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  @Input() menuItems: NavigationItem[] = [];
  @Input() userProfile: UserProfile | null = null;

  public readonly onLogout = output<void>();

  readonly collapsed = signal(localStorage.getItem(COLLAPSED_KEY) === '1');

  @HostBinding('class.sidebar--collapsed')
  get isCollapsed() { return this.collapsed(); }

  toggle(): void {
    const next = !this.collapsed();
    this.collapsed.set(next);
    localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
  }

  getUserInitials(): string {
    if (!this.userProfile) return '';
    return this.userProfile.name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }

  handleLogout(): void {
    this.onLogout.emit();
  }
}
