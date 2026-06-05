import { Component, computed, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthSessionService, EUserRole, LogoutUseCase } from 'auth';
import { BrandingService } from 'shared';

@Component({
  selector: 'edu-student-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './student-layout.html',
  styleUrl: './student-layout.scss'
})
export class StudentLayout implements OnInit, OnDestroy {
  private readonly authSession    = inject(AuthSessionService);
  private readonly brandingService = inject(BrandingService);
  private readonly logoutUseCase  = inject(LogoutUseCase);
  private readonly router         = inject(Router);

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

  ngOnInit(): void {
    const branding = this.authSession.getInstitutionBranding();
    if (branding) {
      this.brandingService.apply(branding);
    }
  }

  ngOnDestroy(): void {
    // Reset branding when leaving the student zone so admin keeps its default theme
    this.brandingService.reset();
  }

  goToAdmin(): void {
    this.router.navigate(['/education/courses']);
  }

  logout(): void {
    this.logoutUseCase.logout();
  }
}
