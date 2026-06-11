import { Component, computed, inject, OnDestroy, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthSessionService, EUserRole, LogoutUseCase } from 'auth';
import { BrandingService } from 'shared';

@Component({
  selector: 'edu-student-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './student-layout.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './student-layout.scss'
})
export class StudentLayout implements OnInit, OnDestroy {
  private readonly authSession    = inject(AuthSessionService);
  private readonly brandingService = inject(BrandingService);
  private readonly logoutUseCase  = inject(LogoutUseCase);
  private readonly router         = inject(Router);
  private routerSub?: Subscription;

  readonly isFullWidthRoute = signal(this.checkFullWidth(this.router.url));

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
    return url.includes('/courses/') || url.includes('/paths/');
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
