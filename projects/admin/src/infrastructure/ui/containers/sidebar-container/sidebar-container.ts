import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { AppSidebarComponent } from 'shared';
import { AdminSidebarUseCase } from '../../../../application/admin-sidebar.usecase';

@Component({
  selector: 'adm-sidebar-container',
  imports: [AppSidebarComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './sidebar-container.html'
})
export class SidebarContainer {
  protected readonly uc = inject(AdminSidebarUseCase);
}
