import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthSessionService, GoogleAuthService, IUser, IUserResponse, mapUser } from 'auth/core';
import { environment } from 'shared/core';


/** Cuentas de invitado: se crean al empezar un curso gratis y se convierten en cuenta real al guardar el avance. */
export const GUEST_EMAIL_DOMAIN = '@invitado.gems.lat';

export function isGuestUser(user: Pick<IUser, 'email'> | null | undefined): boolean {
  return !!user?.email?.endsWith(GUEST_EMAIL_DOMAIN);
}

/** Respuesta de sesión del API (invitado, reclamar): usuario más token. */
interface IGuestSessionResponse extends IUserResponse {
  token: string;
}

/** `acceptDataPolicy` es obligatorio (Ley 1581 de 2012); `acceptTips`, opcional y desmarcado por defecto. */
export interface IClaimAccount {
  firstName: string; lastName: string; email: string; password: string; acceptDataPolicy: boolean; acceptTips: boolean;
}

/**
 * Acceso sin registro: «Empezar gratis» crea un estudiante invitado y abre su sesión al instante.
 * «Guardar mi avance» convierte ese mismo usuario en una cuenta normal, con todo lo que hizo.
 */
@Injectable({ providedIn: 'root' })
export class GuestAccessService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(AuthSessionService);
  private readonly google = inject(GoogleAuthService);
  private readonly url = `${environment.apiUrls.auth.base}/guest`;

  /** Abre una sesión de invitado si no hay ninguna; con sesión, no hace nada. */
  async ensureSession(nickname?: string): Promise<IUser> {
    const current = this.session.user();
    if (this.session.isAuthenticated() && current) return current;
    const r = await firstValueFrom(this.http.post<IGuestSessionResponse>(this.url, { nickname: nickname?.trim() || null }));
    const user = mapUser(r);
    this.session.saveSession(user, r.token);
    return user;
  }

  /** Guarda el avance con Google: el invitado pasa a cuenta normal (o entra a la que ya tenía con ese correo). */
  async claimWithGoogle(credential: string): Promise<IUser> {
    const r = await firstValueFrom(this.google.exchange(credential));
    this.session.saveSession(r.user, r.token, r.mustChangePassword);
    return r.user;
  }

  async claim(data: IClaimAccount): Promise<IUser> {
    const r = await firstValueFrom(this.http.post<IGuestSessionResponse>(`${this.url}/claim`, data));
    const user = mapUser(r);
    this.session.saveSession(user, r.token);
    return user;
  }
}
