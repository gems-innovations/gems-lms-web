import { Injectable, inject } from '@angular/core';
import { AuthSessionService, EUserRole } from 'auth';

interface TourStep { element: string; title: string; description: string; }

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly session = inject(AuthSessionService);
  private shownInSession = false;

  maybeStart(): void {
    const user = this.session.user();
    if (!user || this.shownInSession || typeof window === 'undefined') return;
    const key = `gems-onboarding-${user.id}-${user.role}`;
    if (localStorage.getItem(key)) return;
    this.shownInSession = true;
    setTimeout(() => this.start(true), 450);
  }

  start(markCompleted = false): void {
    const user = this.session.user();
    if (!user || typeof document === 'undefined') return;
    const steps = this.stepsFor(user.role).filter(step => document.querySelector(step.element));
    if (!steps.length) return;
    const key = `gems-onboarding-${user.id}-${user.role}`;
    // Record automatic tours before loading Driver.js. A hard navigation while
    // the popover is open must not schedule the same tour again and cover the
    // destination page.
    if (markCompleted) localStorage.setItem(key, '1');
    void import('driver.js').then(({ driver }) => {
      const tour = driver({
        animate: true,
        overlayOpacity: 0.62,
        popoverClass: 'gems-tour',
        showProgress: true,
        progressText: '{{current}} de {{total}}',
        nextBtnText: 'Siguiente',
        prevBtnText: 'Anterior',
        doneBtnText: 'Listo',
        steps: steps.map(step => ({ element: step.element, popover: { title: step.title, description: step.description } }))
      });
      tour.drive();
    });
  }

  private stepsFor(role: EUserRole): TourStep[] {
    const common = [
      { element: '.app-sidebar__brand, .slayout__brand', title: 'Tu espacio de aprendizaje', description: 'Desde aquí vuelves al inicio de tu panel.' },
      { element: '.app-sidebar__navlinks, .slayout__navlinks', title: 'Navegación', description: 'Accede a las secciones disponibles según tu rol.' },
      { element: '.app-sidebar__user, .slayout__user', title: 'Tu cuenta', description: 'Actualiza tu perfil o cierra sesión desde esta zona.' }
    ];
    if (role === EUserRole.STUDENT) return common;
    return [
      ...common,
      { element: '.ilayout__bell, .edu-layout__sidebar', title: 'Actividad del curso', description: 'Revisa notificaciones y continúa el trabajo pendiente.' }
    ];
  }
}
