import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationBell } from 'education';

@Component({
  selector: 'adm-main-layout',
  imports: [RouterOutlet, NotificationBell],
  templateUrl: './main-layout.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './main-layout.scss'
})
export class MainLayout { }
