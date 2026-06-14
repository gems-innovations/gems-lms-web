import { Component, computed, input, output } from '@angular/core'; // r

@Component({
  selector: 'edu-student-hero',
  templateUrl: './student-hero.html',
  styleUrl: './student-hero.scss',
})
export class StudentHero {
  readonly enrolledCount    = input<number>(0);
  readonly completedCount   = input<number>(0);
  readonly activePathsCount = input<number>(0);

  readonly explore = output<void>();

  protected readonly greeting = computed(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos dÃ­as';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  });

  protected readonly progressPct = computed(() => {
    const total = this.enrolledCount();
    if (!total) return 0;
    return Math.round((this.completedCount() / total) * 100);
  });
}
 