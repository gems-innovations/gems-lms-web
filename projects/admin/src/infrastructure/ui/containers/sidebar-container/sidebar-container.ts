import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { SidebarComponent } from 'shared';
import { AdminSidebarUseCase } from '../../../../application/admin-sidebar.usecase';

@Component({
  selector: 'adm-sidebar-container',
  imports: [SidebarComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './sidebar-container.html'
})
export class SidebarContainer {
  protected readonly uc = inject(AdminSidebarUseCase);
}
