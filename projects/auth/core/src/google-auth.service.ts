import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from 'shared/core';
import { IUser } from './user.model';
import { IUserResponse, mapUser } from './user.mapper';

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

interface IGoogleSessionResponse extends IUserResponse {
  token: string;
  mustChangePassword?: boolean;
}

export interface IGoogleSession {
  user: IUser;
  token: string;
  mustChangePassword: boolean;
}

interface IGoogleIdentity {
  initialize(config: { client_id: string; callback: (response: { credential?: string }) => void; ux_mode: 'popup' }): void;
  renderButton(host: HTMLElement, options: Record<string, string | number>): void;
}

type TGoogleWindow = { google?: { accounts?: { id?: IGoogleIdentity } }; GOOGLE_CLIENT_ID?: string };

/**
 * Entrar con Google (Google Identity Services). El ID de cliente llega en `/config.js`
 * (`GOOGLE_CLIENT_ID`); sin él la opción no aparece. El script de Google se descarga solo cuando
 * alguien llega a una pantalla con el botón, nunca en la carga inicial.
 */
@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  private readonly http = inject(HttpClient);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private script?: Promise<IGoogleIdentity | null>;

  private get clientId(): string {
    return ((globalThis as TGoogleWindow).GOOGLE_CLIENT_ID ?? '').trim();
  }

  /** Hay ID de cliente configurado y estamos en un navegador. */
  get available(): boolean {
    return this.browser && this.clientId !== '';
  }

  private load(): Promise<IGoogleIdentity | null> {
    this.script ??= new Promise(resolve => {
      const ready = () => (globalThis as TGoogleWindow).google?.accounts?.id ?? null;
      if (ready()) { resolve(ready()); return; }
      const tag = document.createElement('script');
      tag.src = SCRIPT_SRC;
      tag.async = true;
      tag.onload = () => resolve(ready());
      tag.onerror = () => { this.script = undefined; resolve(null); };
      document.head.appendChild(tag);
    });
    return this.script;
  }

  /** Dibuja el botón oficial de Google dentro de `host`; false si no se pudo cargar. */
  async renderButton(host: HTMLElement, onCredential: (credential: string) => void): Promise<boolean> {
    if (!this.available) return false;
    const google = await this.load();
    if (!google) return false;
    google.initialize({
      client_id: this.clientId,
      ux_mode: 'popup',
      callback: response => { if (response.credential) onCredential(response.credential); }
    });
    const width = Math.round(Math.min(400, Math.max(240, host.clientWidth || 320)));
    google.renderButton(host, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular', locale: 'es', width });
    return true;
  }

  /**
   * Cambia la credencial de Google por la sesión de GEMS. Si hay un invitado con sesión, el API
   * convierte esa misma cuenta (conserva avance y racha). Seguir y pulsar el botón implica aceptar la
   * política de privacidad y los términos, que se muestran justo debajo del botón.
   */
  exchange(credential: string): Observable<IGoogleSession> {
    return this.http.post<IGoogleSessionResponse>(`${environment.apiUrls.auth.base}/google`, { credential, acceptPolicy: true, tips: false }).pipe(
      map(r => ({ user: mapUser(r), token: r.token, mustChangePassword: r.mustChangePassword === true }))
    );
  }
}
