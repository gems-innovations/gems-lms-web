import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IDashboardMetrics } from '../../../../application/institution.usecase';

@Component({
  selector: 'adm-dashboard-metrics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-metrics.html',
  styleUrl: './dashboard-metrics.scss'
})
export class DashboardMetricsComponent {
  metrics = input<IDashboardMetrics | null>(null);
  isLoading = input<boolean>(false);
}
