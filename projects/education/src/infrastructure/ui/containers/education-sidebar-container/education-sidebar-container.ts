import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { SidebarComponent } from 'shared';
import { NotificationBell } from '../../components/notification-bell/notification-bell';
import { EducationSidebarUseCase } from '../../../../application/education-sidebar.usecase';

@Component({
  selector: 'edu-sidebar-container',
  imports: [SidebarComponent, NotificationBell],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './education-sidebar-container.html'
})
export class EducationSidebarContainer {
  protected readonly uc = inject(EducationSidebarUseCase);
}
