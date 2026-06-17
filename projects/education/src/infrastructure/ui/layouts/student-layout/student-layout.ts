import { Component, computed, inject, OnDestroy, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthSessionService, EUserRole, LogoutUseCase } from 'auth';
import { BrandingService } from 'shared';

const COLLAPSED_KEY = 'gems-sl-collapsed';

@Component({
  selector: 'edu-student-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './student-layout.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './student-layout.scss'
})
export class StudentLayout implements OnInit, OnDestroy {
  private readonly authSession     = inject(AuthSessionService);
  private readonly brandingService = inject(BrandingService);
  private readonly logoutUseCase   = inject(LogoutUseCase);
  private readonly router          = inject(Router);
  private routerSub?: Subscription;

  readonly isFullWidthRoute  = signal(this.checkFullWidth(this.router.url));
  readonly sidebarCollapsed  = signal(this.initCollapsed(this.router.url));

  readonly user = this.authSession.user;
  readonly role = this.authSession.role;

  readonly initials = computed(() => {
    const u = this.user();
    if (!u) return 'U';
    return `${u.firstName[0] ?? ''}${u.lastName[0] ?? ''}`.toUpperCase();
  });

  readonly canAccessAdmin = computed(() =>
    this.role() === EUserRole.ADMIN ||
    this.role() === EUserRole.SUPER_ADMIN ||
    this.role() === EUserRole.INSTRUCTOR
  );

  private checkFullWidth(url: string): boolean {
    // Solo el player real es full-width; preview no cuenta
    return url.includes('/courses/') && !url.includes('/preview/');
  }

  private initCollapsed(url: string): boolean {
    const stored = localStorage.getItem(COLLAPSED_KEY);
    if (stored !== null) return stored === '1';
    // Sin preferencia guardada: home abierto, resto colapsado
    return !url.includes('/learn/home');
  }

  toggleSidebar(): void {
    const next = !this.sidebarCollapsed();
    this.sidebarCollapsed.set(next);
    localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
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

  goToAdmin(): void {
    this.router.navigate(['/education/courses']);
  }

  logout(): void {
    this.logoutUseCase.logout();
  }
}
