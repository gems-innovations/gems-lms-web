// Estados de carga de GEMS (guía: projects/shared/ESTADOS-DE-CARGA.md).
// Punto de entrada propio («shared/loading») para que su código NO entre en el bundle inicial: «shared» se empaqueta
// como un solo módulo y lo que se le agrega pesa en la primera carga de todas las páginas.
export { SkeletonComponent } from './skeleton/skeleton.component';
export type { TSkeletonShape } from './skeleton/skeleton.component';
export { RouteProgressComponent } from './route-progress/route-progress.component';
export { BusyLabelComponent } from './busy-label/busy-label.component';
export { LoadErrorComponent } from './load-error/load-error.component';
export { ConnectionStatusComponent } from './connection-status/connection-status.component';
export { delayedLoading, LoadingGate, LOADING_DELAY_MS, LOADING_MIN_VISIBLE_MS } from './loading-timing';
export type { IDelayedLoadingOptions } from './loading-timing';
export { describeLoadError, isTransientError } from './http-error';
export type { ILoadErrorInfo, TLoadErrorKind } from './http-error';
export { retryTransient } from './retry';
export type { IRetryOptions } from './retry';
export { optimisticUpdate } from './optimistic';
