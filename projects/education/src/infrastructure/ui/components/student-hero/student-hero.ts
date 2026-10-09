import { Component, computed, input, output } from '@angular/core';
import { CountUpDirective, RevealDirective } from 'shared';
import { AchievementsCard } from '../achievements-card/achievements-card';

@Component({
  selector: 'edu-student-hero',
  imports: [CountUpDirective, RevealDirective, AchievementsCard],
  templateUrl: './student-hero.html',
  styleUrl: './student-hero.scss',
})
export class StudentHero {
  readonly enrolledCount    = input<number>(0);
  readonly completedCount   = input<number>(0);
  readonly activePathsCount = input<number>(0);
  /** Curso más reciente sin terminar: «Continuar» pasa a ser la acción principal (en el celular, fija abajo). */
  readonly continueTitle    = input<string | null>(null);
  readonly continueProgress = input<number>(0);

  readonly explore  = output<void>();
  readonly resume = output<void>();

  protected readonly greeting = computed(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  });

  protected readonly progressPct = computed(() => {
    const total = this.enrolledCount();
    if (!total) return 0;
    return Math.round((this.completedCount() / total) * 100);
  });
}
