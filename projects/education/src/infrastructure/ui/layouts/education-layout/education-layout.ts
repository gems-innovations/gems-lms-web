import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationBell } from '../../components/notification-bell/notification-bell';

@Component({
  selector: 'edu-main-layout',
  imports: [RouterOutlet, NotificationBell],
  templateUrl: './education-layout.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './education-layout.scss'
})
export class EducationLayout { }
