import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { AppSidebarComponent } from 'shared';
import { BrandingService } from 'shared/core';
import { AuthSessionService } from 'auth';
import { NotificationBell } from '../../components/notification-bell/notification-bell';
import { EducationSidebarUseCase } from '../../../../application/education-sidebar.usecase';

@Component({
  selector: 'edu-sidebar-container',
  imports: [AppSidebarComponent, NotificationBell],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './education-sidebar-container.html'
})
export class EducationSidebarContainer {
  protected readonly uc = inject(EducationSidebarUseCase);
  protected readonly authSession = inject(AuthSessionService);

  constructor() {
    // Al entrar directo a /education los colores de la institución no se han aplicado aún.
    const branding = this.authSession.getInstitutionBranding();
    if (branding) inject(BrandingService).apply(branding);
  }
}
