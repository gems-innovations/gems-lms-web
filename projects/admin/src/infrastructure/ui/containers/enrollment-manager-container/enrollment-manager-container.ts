import { Component, ChangeDetectionStrategy } from '@angular/core';
import { EnrollmentManagerView } from '../../components/enrollment-manager-view/enrollment-manager-view';

@Component({
  selector: 'adm-enrollment-manager-container',
  standalone: true,
  imports: [EnrollmentManagerView],
  template: '<adm-enrollment-manager-view />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnrollmentManagerContainer {}
