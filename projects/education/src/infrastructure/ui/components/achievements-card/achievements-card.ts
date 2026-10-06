import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit } from '@angular/core';
import {
  LucideCalendarCheck, LucideCircleCheck, LucideDynamicIcon, LucideFlame, LucideFootprints, LucideGraduationCap,
  LucideLibrary, LucideLock, LucideSend, LucideStar, LucideTrophy, LucideZap, type LucideIconInput,
} from '@lucide/angular';
import { CountUpDirective, RevealDirective } from 'shared';
import { TranslatePipe } from 'shared';
import { AchievementsService, IBadge } from '../../../services/achievements.service';

const BADGE_ICONS: Record<string, LucideIconInput> = {
  'first-step': LucideFootprints,
  'first-quiz': LucideCircleCheck,
  perfect: LucideStar,
  'quiz-master': LucideTrophy,
  'on-time': LucideSend,
  finisher: LucideGraduationCap,
  collector: LucideLibrary,
  'streak-3': LucideFlame,
  'streak-7': LucideFlame,
  'streak-30': LucideFlame,
  'weekly-goal': LucideCalendarCheck,
};

const WEEK_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/**
 * Progreso motivacional del estudiante. «compact» para el inicio (racha, nivel, semana y próxima
 * insignia); «full» para Mi aprendizaje, con todas las insignias.
 */
@Component({
  selector: 'edu-achievements-card',
  imports: [TranslatePipe, LucideDynamicIcon, LucideFlame, LucideZap, LucideLock, CountUpDirective, RevealDirective],
  templateUrl: './achievements-card.html',
  styleUrl: './achievements-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AchievementsCard implements OnInit {
  private readonly service = inject(AchievementsService);

  readonly variant = input<'compact' | 'full'>('compact');

  protected readonly profile = this.service.profile;
  protected readonly icons = BADGE_ICONS;

  protected readonly levelPct = computed(() => {
    const p = this.profile();
    if (!p) return 0;
    const span = p.nextLevelXp - p.levelXp;
    return span > 0 ? Math.min(100, Math.round(((p.xp - p.levelXp) / span) * 100)) : 100;
  });

  /** Lunes a domingo de esta semana: hecho, hoy, pendiente o futuro. */
  protected readonly week = computed(() => {
    const p = this.profile();
    const today = new Date();
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const days = new Set(p?.recentDays ?? []);
    return WEEK_LABELS.map((label, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = iso(d);
      return { label, done: days.has(key), today: key === iso(today), future: d > today && key !== iso(today) };
    });
  });

  protected readonly earned = computed(() => (this.profile()?.badges ?? []).filter(b => b.earned));

  /** La insignia pendiente más cercana a conseguirse. */
  protected readonly nextBadge = computed<IBadge | null>(() => {
    const pending = (this.profile()?.badges ?? []).filter(b => !b.earned);
    return pending.sort((a, b) => b.progress / b.target - a.progress / a.target)[0] ?? null;
  });

  protected readonly streakMessage = computed(() => {
    const p = this.profile();
    if (!p) return '';
    if (p.streak === 0) return 'Estudia hoy para empezar una racha';
    if (!p.activeToday) return 'Estudia hoy para no perder tu racha';
    return p.streak >= p.bestStreak && p.streak > 1 ? '¡Tu mejor racha!' : '¡Sigue así!';
  });

  ngOnInit(): void {
    this.service.load().subscribe();
  }

  protected pct(b: IBadge): number { return Math.round((b.progress / b.target) * 100); }

  protected dateOf(value: string): string {
    return new Date(value).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
