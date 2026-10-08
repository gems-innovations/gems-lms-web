import { Component, computed, DestroyRef, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { AuthSessionService, EUserRole, LogoutUseCase } from 'auth';
import { BrandingService, AvatarComponent, browserStorage } from 'shared';
import { TranslatePipe } from 'shared';
import { NotificationBell } from '../../components/notification-bell/notification-bell';

const COLLAPSED_KEY = 'gems-sl-collapsed';

@Component({
  selector: 'edu-student-layout',
  standalone: true,
  imports: [TranslatePipe, RouterOutlet, RouterLink, RouterLinkActive, AvatarComponent, NotificationBell],
  templateUrl: './student-layout.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './student-layout.scss'
})
export class StudentLayout implements OnInit {
  private readonly authSession     = inject(AuthSessionService);
  private readonly brandingService = inject(BrandingService);
  protected readonly institutionName = this.brandingService.institutionName;
  private readonly logoutUseCase   = inject(LogoutUseCase);
  private readonly router          = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly isFullWidthRoute  = signal(this.checkFullWidth(this.router.url));
  readonly isPlayerRoute     = signal(this.checkPlayer(this.router.url));
  readonly sidebarCollapsed  = signal(this.initCollapsed());

  readonly user = this.authSession.user;
  /** Invitado (sin cuenta): Inicio y Catálogo piden crear la cuenta, así que llevan un candado. */
  readonly isGuest = computed(() => this.user()?.email?.endsWith('@invitado.gems.lat') ?? false);
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

  private checkPlayer(url: string): boolean {
    return this.checkFullWidth(url) && !url.includes('/community') && !url.includes('/grades');
  }

  private checkFullWidth(url: string): boolean {
    // Solo el player real (/courses/:id) es full-width y maneja su propio scroll interno;
    // preview, encuesta, comunidad y calificaciones usan el layout normal con scroll de página.
    const path = url.split(/[?#]/)[0];
    return /\/courses\/[^/]+\/?$/.test(path) && !path.includes('/preview/');
  }

  private initCollapsed(): boolean {
    const stored = browserStorage.get(COLLAPSED_KEY);
    if (stored !== null) return stored === '1';
    // Mantener la navegación visible por defecto en todas las pantallas.
    return false;
  }

  toggleSidebar(): void {
    const next = !this.sidebarCollapsed();
    this.sidebarCollapsed.set(next);
    browserStorage.set(COLLAPSED_KEY, next ? '1' : '0');
  }

  ngOnInit(): void {
    const branding = this.authSession.getInstitutionBranding();
    if (branding) this.brandingService.apply(branding);

    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe(e => {
        this.isFullWidthRoute.set(this.checkFullWidth(e.urlAfterRedirects));
        this.isPlayerRoute.set(this.checkPlayer(e.urlAfterRedirects));
      });
  }

  goToAdmin(): void {
    this.router.navigate(['/education/courses']);
  }

  logout(): void {
    this.logoutUseCase.logout();
  }
}
