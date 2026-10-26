import { ErrorHandler, Injectable, inject } from '@angular/core';
import { ClientErrorJournal } from 'shared/core';

@Injectable()
export class ClientErrorHandler implements ErrorHandler {
  private readonly journal = inject(ClientErrorJournal);

  handleError(error: unknown): void {
    // Aviso inofensivo del navegador (un cambio de tamaño que llegó en el mismo cuadro): no es un fallo de la interfaz.
    if (/ResizeObserver loop/i.test(String((error as { message?: string })?.message ?? error))) return;
    this.journal.record('unexpected');
    console.error('[GEMS LMS] Error inesperado de interfaz', error);
  }
}
