import { Injectable, inject } from '@angular/core';
import { isGuestUser } from './public/guest-access.service';
import { AuthSessionService, EUserRole } from 'auth/core';
import { browserStorage } from 'shared/core';

interface TourStep { element: string; title: string; description: string; mobileElement?: string; }

const MOBILE_QUERY = '(max-width: 640px)';

function visibleElement(selector: string): Element | null {
  return Array.from(document.querySelectorAll(selector)).find(el => {
    const box = el.getBoundingClientRect();
    return box.width > 0 && box.height > 0;
  }) ?? null;
}

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly session = inject(AuthSessionService);
  private shownInSession = false;

  maybeStart(): void {
    const user = this.session.user();
    // Quien llega como invitado a un curso gratis va directo a estudiar, sin guía de la plataforma.
    if (!user || isGuestUser(user) || this.shownInSession || typeof window === 'undefined') return;
    const key = `gems-onboarding-${user.id}-${user.role}`;
    if (browserStorage.get(key)) return;
    this.shownInSession = true;
    setTimeout(() => this.start(true), 450);
  }

  start(markCompleted = false): void {
    const user = this.session.user();
    if (!user || typeof document === 'undefined') return;
    const mobile = window.matchMedia(MOBILE_QUERY).matches;
    const steps = this.stepsFor(user.role)
      .map(step => ({ ...step, element: mobile && step.mobileElement ? step.mobileElement : step.element }))
      .filter(step => visibleElement(step.element));
    if (!steps.length) return;
    const key = `gems-onboarding-${user.id}-${user.role}`;
    // Record automatic tours before loading Driver.js. A hard navigation while
    // the popover is open must not schedule the same tour again and cover the
    // destination page.
    if (markCompleted) browserStorage.set(key, '1');
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
        steps: steps.map(step => ({ element: step.element, popover: { title: step.title, description: step.description, ...(mobile ? { side: 'top' as const } : {}) } }))
      });
      tour.drive();
    });
  }

  private stepsFor(role: EUserRole): TourStep[] {
    const common = [
      { element: '.app-sidebar__brand, .slayout__brand', title: 'Tu espacio de aprendizaje', description: 'Desde aquí vuelves al inicio de tu panel.' },
      { element: '.app-sidebar__navlinks, .slayout__navlinks', title: 'Navegación', description: 'Accede a las secciones disponibles según tu rol.', mobileElement: '.slayout__leftnav' },
      { element: '.app-sidebar__user, .slayout__user', title: 'Tu cuenta', description: 'Actualiza tu perfil desde esta zona; en el celular, cerrar sesión está al final de Mi perfil.', mobileElement: '.slayout__profile-btn' }
    ];
    if (role === EUserRole.STUDENT) return common;
    return [
      ...common,
      { element: '.ilayout__bell, .edu-layout__sidebar', title: 'Actividad del curso', description: 'Revisa notificaciones y continúa el trabajo pendiente.' }
    ];
  }
}
