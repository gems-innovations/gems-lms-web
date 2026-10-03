import {
  Component, computed, inject, OnInit, OnDestroy, signal, ChangeDetectionStrategy,
} from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthSessionService, LogoutUseCase } from 'auth';
import { BrandingService, AppSidebarComponent } from 'shared';
import { NotificationBell } from 'education';
import type { NavigationItem, UserProfile } from 'shared';

@Component({
  selector: 'ins-instructor-layout',
  standalone: true,
  imports: [RouterOutlet, AppSidebarComponent, NotificationBell],
  templateUrl: './instructor-layout.html',
  styleUrl: './instructor-layout.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class InstructorLayout implements OnInit, OnDestroy {
  private readonly authSession     = inject(AuthSessionService);
  private readonly brandingService = inject(BrandingService);
  private readonly logoutUseCase   = inject(LogoutUseCase);
  private readonly router          = inject(Router);
  private routerSub?: Subscription;

  readonly isFullWidthRoute = signal(this.checkFullWidth(this.router.url));

  readonly user = this.authSession.user;

  readonly menuItems: NavigationItem[] = [
    { id: 'courses', label: 'Mis cursos',    icon: 'courses', route: '/instructor/courses' },
    { id: 'stats',   label: 'Estadísticas',  icon: 'stats',   route: '/instructor/stats' },
    { id: 'question-bank', label: 'Banco de preguntas', icon: 'bank', route: '/instructor/question-bank' },
  ];

  readonly userProfile = computed<UserProfile | null>(() => {
    const u = this.user();
    if (!u) return null;
    return {
      name:  `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
      email: u.email,
      role:  'Instructor',
      avatar: u.avatarUrl,
    };
  });

  // El editor de cursos ocupa todo el ancho (sin padding centrado).
  private checkFullWidth(url: string): boolean {
    return url.includes('/edit');
  }

  ngOnInit(): void {
    const branding = this.authSession.getInstitutionBranding();
    if (branding) this.brandingService.apply(branding);

    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(e => this.isFullWidthRoute.set(this.checkFullWidth((e as NavigationEnd).urlAfterRedirects)));
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    this.brandingService.reset();
  }

  logout(): void { this.logoutUseCase.logout(); }
}
