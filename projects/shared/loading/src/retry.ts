import { MonoTypeOperatorFunction, fromEvent, race, retry, take, timer } from 'rxjs';
import { isTransientError } from './http-error';

export interface IRetryOptions {
  /** Reintentos automáticos (además del intento inicial). Por defecto 2. */
  count?: number;
  /** Espera base en ms; se duplica en cada intento y lleva un poco de azar. Por defecto 800. */
  baseDelay?: number;
}

/**
 * Reintenta SOLO fallos pasajeros (sin red, 408/429/502/503/504) con espera creciente. Si el navegador está sin
 * conexión, espera al evento `online` (máx. 30 s) en vez de gastar los intentos. Los demás 4xx fallan a la primera.
 * Úsalo en lecturas (GET); nunca en escrituras que no sean idempotentes.
 */
export function retryTransient<T>({ count = 2, baseDelay = 800 }: IRetryOptions = {}): MonoTypeOperatorFunction<T> {
  return retry<T>({
    count,
    delay: (error: unknown, attempt: number) => {
      if (!isTransientError(error)) throw error;
      if (typeof window !== 'undefined' && navigator.onLine === false) {
        return race(fromEvent(window, 'online').pipe(take(1)), timer(30_000));
      }
      return timer(baseDelay * 2 ** (attempt - 1) * (0.8 + Math.random() * 0.4));
    },
  });
}
