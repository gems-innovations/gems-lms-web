import { HttpErrorResponse } from '@angular/common/http';

/** Tipo de fallo, para elegir icono, texto y si tiene sentido reintentar. */
export type TLoadErrorKind = 'offline' | 'timeout' | 'not-found' | 'forbidden' | 'session' | 'rate-limit' | 'server' | 'unknown';

export interface ILoadErrorInfo {
  kind: TLoadErrorKind;
  /** Frase corta y humana: qué pasó. */
  title: string;
  /** Qué puede hacer la persona (o qué haremos nosotros). */
  message: string;
  /** Reintentar puede funcionar (red, servidor ocupado). En 404/403 no se ofrece «Reintentar». */
  canRetry: boolean;
}

/** Fallos de red (sin respuesta) o de servidor ocupado: los únicos que vale la pena reintentar solos. */
export function isTransientError(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse)) return isTimeout(error);
  return [0, 408, 429, 502, 503, 504].includes(error.status);
}

function isTimeout(error: unknown): boolean {
  return (error as { name?: string } | null)?.name === 'TimeoutError';
}

function browserOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

/**
 * Traduce cualquier error de carga a un mensaje para personas (nunca «Error 500» ni «Http failure response»).
 * `what` completa la frase «No pudimos cargar {what}» (p. ej. «los cursos», «esta lección»).
 */
export function describeLoadError(error: unknown, what = 'esta información'): ILoadErrorInfo {
  const status = error instanceof HttpErrorResponse ? error.status : -1;
  const online = browserOnline();
  if (!online || status === 0) {
    return {
      kind: 'offline',
      title: online ? 'No logramos conectarnos' : 'Sin conexión',
      message: online
        ? `No pudimos traer ${what}. Revisa tu internet; lo intentamos de nuevo apenas responda.`
        : `Parece que no tienes internet. Cuando vuelva la señal cargamos ${what} sin que hagas nada.`,
      canRetry: true,
    };
  }
  if (isTimeout(error) || status === 408 || status === 504) {
    return { kind: 'timeout', title: 'Está tardando más de lo normal', message: `La conexión está lenta y ${what} no alcanzó a llegar. Inténtalo otra vez.`, canRetry: true };
  }
  if (status === 404 || status === 400 || status === 410) {
    return { kind: 'not-found', title: 'No lo encontramos', message: `Puede que ${what} se haya movido o ya no esté disponible.`, canRetry: false };
  }
  if (status === 401) {
    return { kind: 'session', title: 'Tu sesión se cerró', message: 'Vuelve a iniciar sesión para seguir donde ibas.', canRetry: false };
  }
  if (status === 403) {
    return { kind: 'forbidden', title: 'No tienes acceso', message: `Tu cuenta no tiene permiso para ver ${what}. Si crees que es un error, avísale a tu institución.`, canRetry: false };
  }
  if (status === 429) {
    return { kind: 'rate-limit', title: 'Hay mucha gente entrando', message: 'Espera unos segundos y vuelve a intentarlo.', canRetry: true };
  }
  if (status >= 500) {
    return { kind: 'server', title: 'Tuvimos un problema de nuestro lado', message: `No es tu culpa: ${what} no cargó por una falla nuestra. Inténtalo en un momento.`, canRetry: true };
  }
  return { kind: 'unknown', title: 'Algo no salió bien', message: `No pudimos cargar ${what}. Inténtalo de nuevo.`, canRetry: true };
}
