import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { SidebarComponent } from 'shared';
import { EducationSidebarUseCase } from '../../../../application/education-sidebar.usecase';

@Component({
  selector: 'edu-sidebar-container',
  imports: [SidebarComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './education-sidebar-container.html'
})
export class EducationSidebarContainer {
  protected readonly uc = inject(EducationSidebarUseCase);
}
