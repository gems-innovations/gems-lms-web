import { ErrorHandler, Injectable, inject } from '@angular/core';
import { ClientErrorJournal } from 'shared/core';

@Injectable()
export class ClientErrorHandler implements ErrorHandler {
  private readonly journal = inject(ClientErrorJournal);

  handleError(error: unknown): void {
    this.journal.record('unexpected');
    console.error('[GEMS LMS] Error inesperado de interfaz', error);
  }
}
