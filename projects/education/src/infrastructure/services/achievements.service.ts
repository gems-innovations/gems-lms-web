import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { celebrate, environment, ToastService } from 'shared';

export interface IBadge {
  id: string;
  title: string;
  description: string;
  earned: boolean;
  earnedAt: string | null;
  progress: number;
  target: number;
}

export interface IAchievements {
  xp: number;
  level: number;
  levelXp: number;
  nextLevelXp: number;
  streak: number;
  bestStreak: number;
  activeToday: boolean;
  weekDays: number;
  weeklyGoal: number;
  recentDays: string[];
  badges: IBadge[];
}

const SEEN_KEY = 'gems-badges-seen';

/**
 * Puntos, nivel, racha, meta semanal e insignias del estudiante (calculados por el API a partir de
 * su actividad). Al detectar una insignia nueva la celebra una sola vez por dispositivo.
 */
@Injectable({ providedIn: 'root' })
export class AchievementsService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly url = environment.apiUrls.education.activity.replace(/\/me$/, '/achievements');

  private readonly _profile = signal<IAchievements | null>(null);
  readonly profile = this._profile.asReadonly();

  load(): Observable<IAchievements | null> {
    return this.http.get<IAchievements>(this.url).pipe(
      tap(p => { this._profile.set(p); this.announceNewBadges(p); }),
      map(p => p as IAchievements | null),
      catchError(() => of(null)),
    );
  }

  private announceNewBadges(p: IAchievements): void {
    if (typeof localStorage === 'undefined') return;
    let seen: string[] | null = null;
    try { seen = JSON.parse(localStorage.getItem(SEEN_KEY) ?? 'null'); } catch { seen = null; }
    const earned = p.badges.filter(b => b.earned).map(b => b.id);
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(earned)); } catch { /* sin almacenamiento: no se anuncia */ }
    // Primera visita en este dispositivo: se guardan sin celebrar lo que ya tenía.
    if (seen === null) return;
    const fresh = p.badges.filter(b => b.earned && !seen!.includes(b.id));
    if (!fresh.length) return;
    void celebrate({ x: 0.85, y: 0.25 });
    this.toast.success(fresh.length === 1
      ? `¡Nueva insignia: ${fresh[0].title}!`
      : `¡Ganaste ${fresh.length} insignias nuevas: ${fresh.map(b => b.title).join(', ')}!`);
  }
}
