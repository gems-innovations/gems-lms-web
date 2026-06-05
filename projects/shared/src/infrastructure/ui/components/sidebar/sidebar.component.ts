import { Component, Input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';


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
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  @Input() menuItems: NavigationItem[] = [];
  @Input() userProfile: UserProfile | null = null;
  
  public readonly onLogout = output<void>();

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
