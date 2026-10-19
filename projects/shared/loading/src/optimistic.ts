import { WritableSignal } from '@angular/core';
import { Observable, firstValueFrom, isObservable } from 'rxjs';

/**
 * «Optimistic UI»: aplica el cambio en pantalla al instante, manda la petición y, si falla, deshace el cambio y
 * llama a `onError` (por ejemplo, un aviso «No se guardó; lo dejamos como estaba»).
 *
 * Solo para acciones seguras: reversibles y sin efectos que la persona no vea (marcar como leído, favoritos,
 * preferencias). Nunca para pagos, entregas de evaluaciones ni nada que dependa de la respuesta del servidor.
 */
export async function optimisticUpdate<T, R = unknown>(
  state: WritableSignal<T>,
  change: (current: T) => T,
  request: () => Observable<R> | Promise<R>,
  onError?: (error: unknown) => void,
): Promise<R | undefined> {
  const before = state();
  const optimistic = change(before);
  state.set(optimistic);
  try {
    const pending = request();
    return await (isObservable(pending) ? firstValueFrom(pending) : pending);
  } catch (error) {
    // Se deshace solo si nadie cambió el valor mientras tanto (otra acción más nueva manda).
    if (state() === optimistic) state.set(before);
    onError?.(error);
    return undefined;
  }
}
