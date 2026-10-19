# Estados de carga, progreso, errores y sin conexión

Guía del sistema de estados de carga de GEMS LMS. El código vive en el punto de entrada **`shared/loading`**
(`projects/shared/loading/src/`). Es un punto de entrada aparte porque `shared` se empaqueta como un solo módulo, y todo
lo que se le agrega pesa en la primera carga de cualquier página (el bundle inicial está cerca del límite de 800 kB).

```ts
import { SkeletonComponent, LoadErrorComponent, BusyLabelComponent, retryTransient } from 'shared/loading';
```

## Reglas

1. **Nada aparece antes de 300 ms.** Una carga rápida no debe parpadear. Los esqueletos reservan su espacio desde el
   primer fotograma, pero se dibujan a los 300 ms (`--sk-delay`). Los spinners y la barra de ruta usan `LoadingGate` /
   `delayedLoading()`.
2. **Si algo llegó a verse, se queda al menos 500 ms** (`LOADING_MIN_VISIBLE_MS`). Así no hay destellos de 50 ms.
3. **Se reserva el espacio (CLS ≈ 0).** El esqueleto tiene la forma del contenido real: misma caja, mismo
   `aspect-ratio` de imagen, el mismo número de columnas. Las imágenes llevan `width`/`height` o `aspect-ratio`.
4. **Los botones no cambian de tamaño** al pasar a «cargando» (`lib-busy-label`, `lib-button [loading]`).
5. **Carga progresiva.** Se muestra lo que ya llegó y solo espera lo que falta (ver la ficha de curso: el resumen de
   la portada se pinta al instante y el temario espera).
6. **Errores con acción y en lenguaje humano.** Nunca `err.message` ni «Http failure response». Siempre «Reintentar»
   cuando tiene sentido y «Volver» cuando no. Un fallo de carga **no** es un estado vacío: «No hay cursos» y «No
   pudimos cargar los cursos» son pantallas distintas.
7. **Sin conexión:** se dice sin culpar, no se promete lo que no se hace (no hay cola de envíos) y se reintenta solo al
   volver la red.
8. **Movimiento reducido:** con `prefers-reduced-motion` o `html.reduce-motion` no hay barrido ni giro; queda el bloque
   quieto. Con `html.modo-ligero` tampoco hay barrido.
9. **Accesible:** el contenedor que carga lleva `[attr.aria-busy]`; el esqueleto con `label` se anuncia una vez
   (`role="status"`); los errores son `role="alert"`; los botones ocupados llevan `aria-busy`.
10. **Ligero:** solo CSS y señales; ninguna librería nueva. Solo se animan `transform` y `opacity`.

## Componentes

| Pieza | Para qué | Ejemplo |
|---|---|---|
| `lib-skeleton` | Esqueleto con forma. Compuestas: `course-card`, `table-row`, `lesson`, `quiz`, `chart`, `profile`, `stat`, `list-item`. Primitivas: `text`, `title`, `circle`, `block`, `pill` | `<lib-skeleton shape="course-card" [count]="6" label="Cargando el catálogo" />` |
| `lib-load-error` | Error con icono de vidrio, mensaje según el fallo (sin red, servidor, 404, 403, sesión, 429, lentitud), «Reintentar» y «Volver». `compact` para una sección | `<lib-load-error [error]="e" what="los cursos" (retry)="cargar()" [backLink]="'/'" />` |
| `lib-busy-label` | Etiqueta de botón que no cambia de ancho; el spinner y el texto de espera entran a los 300 ms | `<button [disabled]="x()" [attr.aria-busy]="x()"><lib-busy-label [busy]="x()" busyText="Entrando…">Empezar</lib-busy-label></button>` |
| `lib-route-progress` | Barra de 3 px arriba en cambios de página que tardan más de 200 ms | En `app.html` (diferida con `@defer`) |
| `lib-connection-status` | «Sin conexión» / «Conexión recuperada». `placement="bottom"` en pantallas con controles arriba (Taps) | En `app.html` |
| `lib-button [loading]` (en `shared`) | Ya no cambia de tamaño: el contenido se oculta y el spinner se superpone a los 300 ms. `loadingText` para lectores | `<lib-button [loading]="guardando()" loadingText="Guardando…">Guardar</lib-button>` |
| ~~`lib-loading-skeleton`~~ | Eliminado: los paneles de admin e instructor usan `lib-skeleton` (`table-row`, `list-item`) | `<lib-skeleton shape="table-row" [count]="5" label="Cargando contenido" />` |

## Utilidades

| Función | Qué hace |
|---|---|
| `delayedLoading(señal, { delay, minVisible })` | Señal «¿muestro el indicador?» con las reglas 1 y 2. En el servidor devuelve la misma señal |
| `LoadingGate` | La misma lógica sin Angular (se puede usar en el motor de Taps) |
| `describeLoadError(err, 'los cursos')` | `{ kind, title, message, canRetry }` en español humano |
| `retryTransient({ count, baseDelay })` | Operador RxJS: reintenta solo fallos pasajeros (red, 408/429/502/503/504) con espera creciente; sin red, espera a `online`. Solo para lecturas |
| `optimisticUpdate(señal, cambio, petición, onError)` | Aplica el cambio al instante y lo deshace si falla. Solo para acciones reversibles (leído, favoritos, preferencias); nunca evaluaciones ni pagos |
| `FileUploadService.uploadWithProgress()` (en `shared`) | Subida con avance real `{ progress, file? }`. `lib-image-upload` ya lo muestra |

## Primer arranque (`projects/main/src/index.html`)

- Pantalla de marca (logo original del zorro, `logo-144.png`, sin rediseño) con estilos en línea: se pinta con el HTML,
  antes de descargar y ejecutar Angular.
- Solo aparece si `<app-root>` llega vacío. Con prerender/SSR el contenido real ya está en el HTML y la pantalla no se
  muestra (no retrasa nada ni tapa el contenido prerenderizado).
- Se funde (220 ms) después del primer pintado de la primera página (`arranque.ts`, llamado desde `App`).
- A los 6 s dice «Tu conexión va lenta; ya casi está»; a los 20 s ofrece «Recargar». Si Angular no arranca (chunk caído)
  muestra el error con «Recargar» (`main.ts`).

## Cómo aplicarlo en una pantalla

```html
<section [attr.aria-busy]="estado() === 'cargando'">
  @switch (estado()) {
    @case ('cargando') { <lib-skeleton shape="course-card" [count]="3" label="Cargando cursos" /> }
    @case ('error') { <lib-load-error compact [error]="error()" what="los cursos" (retry)="cargar()" /> }
    @default { … contenido … (y su estado vacío, si no hay datos) }
  }
</section>
```

Guarda el **error original** (no un booleano ni un texto) para que `lib-load-error` elija el mensaje.

## Unificación con el sistema visual (`feat/sistema-visual`)

Los estilos usan los tokens de esa rama con respaldo: `var(--dur-base, 200ms)`, `var(--curva-salida, …)`,
`var(--radio-tarjeta, 16px)`, `var(--glass-*, …)`. Cuando esa rama llegue a `main` funcionan sin cambios. Pendiente al
unir: el barrido de `lib-skeleton` (`sk-sweep`) es el mismo que `.gm-skeleton` (`gm-barrido`, 1,4 s, solo transform);
se puede reemplazar por la clase global, y `.card--skeleton` de `public.scss` deja de usarse en la portada.

## Estados vacíos y `lib-empty-state kind="error"` (PR #33)

Los estados vacíos son de `feat/estados-vacios` (PR #33), que amplía `lib-empty-state` con `kind="error"` y el catálogo
`EMPTY_STATES`. Reparto:

- **`lib-empty-state kind="error"`**: el error genérico de una sección cuando basta «No se pudo cargar · Reintentar»
  (así queda el catálogo del estudiante en #33; esta rama no toca esa parte).
- **`lib-load-error`**: cuando importa **por qué** falló (sin red / servidor / no existe / sin permiso / lentitud), se
  quiere reintento automático al volver la conexión o un botón «Reintentar» que no cambie de tamaño mientras
  reintenta (ficha pública, reproductor, entrega del quiz, portada).
- Con ambos ya mezclados (rama de integración): `lib-load-error` **delega su dibujo** en `lib-empty-state` (`kind="error"`, `size="sm"` y `framed` si es
  `compact`, `title`/`description` desde `describeLoadError`, «Reintentar» y «Volver» como acciones), conservando su lógica
  (reintento al volver la red y bloqueo mientras `retrying`). Ya no tiene scss propio ni placa de vidrio propia.

## Pendiente

- **Paneles de admin e instructor**: ya usan `lib-skeleton` (el genérico `lib-loading-skeleton` se eliminó); falta darles
  forma propia (`stat`, `chart`, `table-row` con sus columnas); en estadísticas del docente un
  fallo deja el esqueleto para siempre (`instructor-stats.usecase.ts`, `forkJoin` sin `error`); reportes muestran texto
  plano «Generando reporte…»; gestión de usuarios, libro de calificaciones y tablero de institución muestran el estado
  vacío cuando la carga falla.
- Muchos `catchError` muestran `err.message` en avisos (`course.usecase.ts`, `enrollment.usecase.ts`): pasar por
  `describeLoadError`.
- Marcar lección completa es optimista pero no deshace ni reintenta si falla (`course-player.usecase.ts`).
- Entregas de tareas y subtítulos suben sin progreso: usar `uploadWithProgress`.
- Imágenes de las lecturas (markdown) sin tamaño reservado.
