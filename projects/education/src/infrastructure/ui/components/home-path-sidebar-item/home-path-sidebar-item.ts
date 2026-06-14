import { Component, computed, input, output } from '@angular/core';
import { IEnrolledPathEntry } from '../../../../domain/model/enrollment.model';

@Component({
  selector: 'edu-home-path-sidebar-item',
  standalone: true,
  templateUrl: './home-path-sidebar-item.html',
  styleUrl: './home-path-sidebar-item.scss',
})
export class HomePathSidebarItem {
  readonly entry = input.required<IEnrolledPathEntry>();
  readonly open  = output<string>();

  protected readonly pct = computed(() =>
    Math.round(this.entry().enrollment.overallPercentage)
  );

  protected readonly completed = computed(() =>
    this.entry().path.steps.filter((_, i) =>
      i < Math.round(this.entry().enrollment.overallPercentage / 100 * this.entry().path.steps.length)
    ).length
  );
}
