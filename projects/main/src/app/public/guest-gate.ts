import { inject, Injectable, signal } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { AuthSessionService } from 'auth/core';
import { isGuestUser } from './guest-access.service';

/** Qué se desbloquea al crear la cuenta, según la sección que el invitado intentó abrir. */
const LOCKED: { test: RegExp; label: string }[] = [
  { test: /^\/learn\/courses\/[^/]+\/community/, label: 'la comunidad del curso' },
  { test: /^\/learn\/courses\/[^/]+\/grades/, label: 'tus calificaciones' },
  { test: /^\/learn\/courses\/[^/]+\/survey/, label: 'la encuesta del curso' },
  { test: /^\/learn\/catalog/, label: 'todos los cursos' },
  { test: /^\/learn\/preview/, label: 'todos los cursos' },
  { test: /^\/learn\/profile/, label: 'tu perfil y tus logros' },
  { test: /^\/learn(\/home)?\/?(\?.*)?$/, label: 'tu inicio con racha y recomendaciones' },
];

/** Avisa a la barra de invitado qué sección quiso abrir, para mostrarle la invitación a crear su cuenta. */
@Injectable({ providedIn: 'root' })
export class GuestGateService {
  readonly blocked = signal<string | null>(null);
}

/**
 * El invitado entra a sus cursos sin trabas; el resto de la zona de estudiante pide crear la cuenta.
 * Dentro de la app se cancela la navegación (se queda donde estaba); si llega por URL directa, va a «Mis cursos».
 */
export const guestGateGuard: CanActivateChildFn = (_route, state) => {
  if (!isGuestUser(inject(AuthSessionService).user())) return true;
  const locked = LOCKED.find(l => l.test.test(state.url));
  if (!locked) return true;
  inject(GuestGateService).blocked.set(locked.label);
  const router = inject(Router);
  return router.navigated ? false : router.createUrlTree(['/learn/my-learning']);
};
