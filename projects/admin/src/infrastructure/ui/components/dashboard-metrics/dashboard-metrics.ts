import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IDashboardMetrics } from '../../../../application/institution.usecase';
import { RevealDirective, CountUpDirective } from 'shared';

@Component({
  selector: 'adm-dashboard-metrics',
  standalone: true,
  imports: [RevealDirective, CountUpDirective, CommonModule],
  templateUrl: './dashboard-metrics.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './dashboard-metrics.scss'
})
export class DashboardMetricsComponent {
  metrics = input<IDashboardMetrics | null>(null);
  isLoading = input<boolean>(false);
}
