import { ChangeDetectionStrategy, Component, DestroyRef, PLATFORM_ID, booleanAttribute, computed, inject, input, output } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { EmptyStateComponent } from 'shared';
import type { EmptyStateIcon } from 'shared';
import { describeLoadError } from '../http-error';

/**
 * Error de carga con mensaje humano y una acción clara («Reintentar» y/o «Volver»). El texto sale del tipo de fallo
 * (sin conexión, servidor, no encontrado, sin permiso…), nunca de `err.message`. Si el fallo fue por falta de red,
 * reintenta solo cuando vuelve la conexión.
 *
 * El dibujo lo hace `lib-empty-state kind="error"` (una sola placa de vidrio para vacíos y errores; ver
 * ESTADOS-DE-CARGA.md): este componente solo pone la lógica (qué mensaje, reintento y reintento al volver la red).
 *
 *   @if (error(); as e) { <lib-load-error [error]="e" what="los cursos" (retry)="cargar()" /> }
 *
 * `compact`: versión en línea para una sección (tarjeta, panel); sin él ocupa el área de la página.
 */
@Component({
  selector: 'lib-load-error',
  imports: [EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.le--compact]': 'compact()', '[attr.data-kind]': 'info().kind' },
  template: `
    <lib-empty-state
      kind="error"
      [icon]="icon()"
      [size]="compact() ? 'sm' : 'md'"
      [framed]="compact()"
      [headingLevel]="2"
      [title]="title() ?? info().title"
      [description]="message() ?? info().message"
      [actionLabel]="info().canRetry ? (retrying() ? 'Reintentando…' : 'Reintentar') : ''"
      [secondaryLabel]="backLink() ? backLabel() : ''"
      [secondaryLink]="backLink() ?? undefined"
      (action)="onRetry()"
    />
  `,
  styles: ':host { display: block; }',
})
export class LoadErrorComponent {
  /** El error tal como llegó (HttpErrorResponse, TimeoutError…). */
  readonly error = input<unknown>(null);
  /** Qué se intentaba cargar, para completar la frase: «los cursos», «esta lección». */
  readonly what = input('esta información');
  /** Título propio (opcional); si no, el del tipo de fallo. */
  readonly title = input<string | null>(null);
  /** Texto propio (opcional) para acciones que no son «cargar» (p. ej. un envío que falló). */
  readonly message = input<string | null>(null);
  /** Enlace para salir («Volver»); null lo oculta. */
  readonly backLink = input<string | readonly unknown[] | null>(null);
  readonly backLabel = input('Volver');
  /** true mientras el reintento está en curso (no se vuelve a emitir). */
  readonly retrying = input(false);
  readonly compact = input(false, { transform: booleanAttribute });

  readonly retry = output<void>();

  protected readonly info = computed(() => describeLoadError(this.error(), this.what()));
  protected readonly icon = computed<EmptyStateIcon>(() => {
    switch (this.info().kind) {
      case 'not-found': return 'search';
      case 'forbidden':
      case 'session': return 'lock';
      default: return 'alert';
    }
  });

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    // Sin red: en cuanto vuelve, reintenta solo (la persona no tiene que adivinar cuándo).
    const onOnline = () => { if (this.info().kind === 'offline' && !this.retrying()) this.retry.emit(); };
    window.addEventListener('online', onOnline);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('online', onOnline));
  }

  protected onRetry(): void { if (!this.retrying()) this.retry.emit(); }
}
