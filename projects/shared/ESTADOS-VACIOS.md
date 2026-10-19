# Estados vacíos informativos

Hoy casi todo GEMS LMS está vacío para una persona nueva: sin cursos, sin estudiantes, sin reportes. Ese primer
vistazo decide si se queda. Un estado vacío no es «no hay nada»: es la pantalla que **explica qué es la sección,
por qué está vacía y cuál es el siguiente paso**.

- Componente: `lib-empty-state` (`projects/shared/src/infrastructure/ui/components/empty-state/`).
- Textos: `EMPTY_STATES` en `empty-states.copy.ts` (catálogo único, por rol).
- Iconos: `EMPTY_STATE_ICONS` en `empty-state.icons.ts` (trazos de lucide en línea, sin importar `@lucide/angular` para no engordar el bundle inicial; dentro de una placa de vidrio; nunca emojis).

## Anatomía

```
   ·  ◆            arte (decorativo, aria-hidden): halo + figuras de marca + placa de vidrio con el icono
     [ icono ]
   ·        ·
  Título (≤ 40)    qué es la sección, en positivo («Crea tu primer grupo», no «Sin grupos»)
  Texto (≤ 120)    por qué está vacía y qué pasa cuando se llene
  [Acción]  [Secundaria]   botón principal (≤ 24) = el siguiente paso; secundaria opcional y más ligera
```

## Tipos y cuándo usar cada uno

| Tipo (`kind`) | Cuándo | Tono del arte | Acción | Rol ARIA |
|---|---|---|---|---|
| `first-use` | La sección nunca ha tenido datos y la persona puede llenarla. | Violeta/cian de marca | El primer paso real («Crear curso», «Crear grupo») | `group` |
| `no-results` | Hay datos, pero la búsqueda o los filtros no encuentran nada. | Cian, anillo punteado | Siempre «Limpiar filtros» o «Borrar búsqueda» | `status` (se anuncia) |
| `done` | No queda nada pendiente: celebración breve. | Verde con chispas | Opcional: qué hacer después | `group` |
| `no-access` | El rol, la inscripción o la institución no permiten ver la sección. | Magenta, candado | A dónde ir o a quién acudir | `group` |
| `error` | No se pudo cargar. | Rojo, anillo cortado | «Reintentar» | `alert` |
| `info` | Vacío que la persona no puede resolver desde aquí (depende de otros). | Violeta/verde azulado | Opcional | `group` |

Reglas rápidas:

1. **Primer uso ≠ sin resultados.** Si hay búsqueda o filtros activos, usa `no-results` con su acción de limpiar,
   aunque la lista también esté vacía sin filtros. Mostrar «Crea tu primer…» cuando hay un filtro puesto confunde.
2. **No prometas lo que no existe.** Solo se enlaza a lo que ya funciona: Taps existe en `/taps`, así que el
   estudiante sin cursos ve «Jugar un Tap».
3. **Una sola acción principal.** Si la página ya tiene el botón arriba (p. ej. «Nuevo período»), el estado vacío
   repite la acción solo como atajo; no agregues una tercera.
4. **No dupliques con formularios abiertos.** Si la persona ya abrió el formulario de crear, oculta el estado vacío
   (`@if (!draft())`), como en períodos, banco de preguntas y foro.
5. **Pistas en línea no son estados vacíos.** Los textos dentro de editores («Esta lección aún no tiene contenido»,
   selectores, listas de un desplegable) siguen siendo pistas de una línea.
6. **Error**: el detalle técnico y los estados de carga son del patrón de `feat/estados-carga`. Aquí solo va el
   mensaje humano con «Reintentar». Cuando ese patrón exista, `kind="error"` debe delegar en su componente (ver
   «Unificación»).

## Uso

```html
<!-- Primer uso con enlaces (se dibujan como <a routerLink>) -->
<lib-empty-state [copy]="copy.student.myCourses" actionLink="/learn/catalog" secondaryLink="/taps" />

<!-- Sin resultados: limpia y la lista vuelve -->
<lib-empty-state [copy]="copy.common.noSearchResultsFor" [params]="{ q: search() }" (action)="onSearch('')" />

<!-- Error con reintento; los inputs explícitos ganan al catálogo -->
<lib-empty-state [copy]="copy.common.error" title="No pudimos cargar el foro" (action)="loadThreads()" />
```

```ts
import { EmptyStateComponent, EMPTY_STATES } from 'shared';
// en el componente:
protected readonly copy = EMPTY_STATES;
```

| Input | Para qué |
|---|---|
| `copy` | Entrada del catálogo (tipo, icono y textos). |
| `kind`, `icon`, `title`, `description` | Sobrescriben al catálogo. Sin `copy` el tipo es `info` (compatibilidad con el uso anterior). |
| `params` | Valores para `{clave}` en los textos (`{ q: 'álgebra' }`, `{ n: 12 }`). |
| `actionLabel` / `secondaryLabel` | Cambian el botón; `''` lo oculta aunque el catálogo traiga uno. |
| `actionLink`, `actionQueryParams`, `secondaryLink` | Con enlace se dibuja `<a routerLink>`; sin enlace, `<button>` que emite `(action)` / `(secondaryAction)`. Los enlaces también emiten (sirve para analítica). |
| `headingLevel` | 1–4. Respeta la jerarquía: `2` si es lo único bajo el `h1` de la página, `1` si no hay encabezado. |
| `size` | `sm` para desplegables, columnas laterales y tarjetas pequeñas. |
| `framed` | Lo dibuja dentro de una tarjeta de vidrio cuando no hay contenedor alrededor. |
| `autofocusAction` | Enfoca la acción principal al aparecer (después de enviar algo, p. ej. la encuesta). También hay `focusAction()`. |
| `svgIcon` | Obsoleto, se conserva por compatibilidad. Usa `icon`. |

## Accesibilidad

- El contenedor tiene `role` según el tipo (`status`, `alert` o `group`) y `aria-labelledby`/`aria-describedby`
  apuntando al título y al texto: un lector de pantalla anuncia «Nada coincide con tu búsqueda» al filtrar.
- El arte es decorativo (`aria-hidden`), el título es un encabezado real (`h1`–`h4`).
- Los botones miden al menos 44 px de alto, tienen anillo de foco visible (`--color-focus-ring`) y en el celular
  (≤ 480 px) se apilan a todo el ancho.
- El texto largo (por ejemplo, la búsqueda de la persona dentro de la descripción) corta sin desbordar.

## Tema, movimiento y responsive

- Solo usa tokens de `design-system.scss` (`--color-*`), así que sirve en modo oscuro y en `.light-mode` sin reglas
  extra. Los tokens de vidrio y movimiento del sistema visual (`--glass-*`, `--dur-*`, `--curva-*`, `--radio-*`)
  se usan con valores de respaldo: hoy funciona sin ellos y, cuando se fusione `feat/sistema-visual`, los toma solo.
- Movimiento: entra una vez (aparece, la placa rebota, las chispas de `done` brillan) y se queda quieto. Con
  `prefers-reduced-motion` o la clase `.reduce-motion` no hay animación.
- Probado a 375×812 y en escritorio.

## Traducción

Todos los textos pasan por `I18nService` (la clave es el propio texto en español). Para traducir un estado vacío
basta con sumar su texto a `shared/core/i18n/translations.ts`; las pantallas no cambian. Por eso el catálogo es la
única fuente: no escribas textos de estados vacíos directamente en las plantillas.

La prueba `empty-state.component.spec.ts` revisa todo el catálogo: límites de longitud, iconos conocidos, que cada
«sin resultados» ofrezca limpiar y que no haya emojis.

## Unificación con las otras ramas

- **`feat/estados-carga`** (estados de carga y error): al momento de esta rama no había publicado su componente.
  Este PR **extiende** el `lib-empty-state` que ya existía (misma etiqueta y mismos inputs `title`,
  `description`, `actionLabel`, `(action)`, `svgIcon`), así que los usos anteriores siguen funcionando. Si esa rama
  crea un estado vacío base o un componente de error, la unión propuesta es: (1) quedarse con este componente como
  base de vacíos, (2) que `kind="error"` dibuje su componente de error dentro del mismo hueco (o que el suyo use
  `EMPTY_STATES.common.error` para el texto humano), y (3) conservar un solo selector `lib-empty-state`.
- **`feat/sistema-visual`**: los estilos ya leen sus tokens (`--glass-*`, `--dur-*`, `--curva-*`, `--radio-*`,
  `--texto-titulo-3`) con respaldo. Al fusionar no hay que tocar nada; si cambia la placa `.gm-icono`, se puede
  reemplazar `.es__tile` por esa clase.
- **Taps** (`projects/main/src/app/taps/`, otra ronda): no se tocó. El texto para «aún no has jugado Taps» ya está
  en el catálogo (`student.tapsPlayed`) para cuando exista un historial por persona.

## Inventario

Cómo se veía cada pantalla vacía antes de este cambio y qué muestra ahora. «Prioridad» = la ve una persona nueva
de ese rol en su primera sesión.

### Estudiante

| Pantalla | Ruta | Antes | Ahora | Clave | Prioridad |
|---|---|---|---|---|---|
| Inicio sin cursos ni populares | `/learn/home` | Texto genérico, sin acción | Primer uso: «Explorar el catálogo» + «Jugar un Tap» | `student.home` | Alta |
| Mis cursos | `/learn/my-learning` | Línea gris con enlace | Primer uso con catálogo + Tap | `student.myCourses` | Alta |
| Mis rutas | `/learn/my-learning` | Línea gris con enlace | Informativo + «Ver rutas del catálogo» (abre el catálogo filtrado con `?tipo=rutas`) | `student.myPaths` | Alta |
| Mis certificaciones | `/learn/my-learning` | «Aún no tienes certificaciones.» | Primer uso que explica cómo se ganan | `student.certificates` | Alta |
| Próximas entregas (columna) | `/learn/my-learning` | Línea gris | Completado compacto | `student.deadlines` | Media |
| Buscadores de Mi aprendizaje | `/learn/my-learning` | «Sin resultados para "x"», sin acción | Sin resultados + «Borrar búsqueda» | `common.noSearchResultsFor` | Media |
| Notificaciones (campanita) | todas | «No tienes notificaciones.» | Completado compacto «Estás al día» | `student.notifications` | Alta |
| Catálogo con filtros | `/learn/catalog` | «Sin resultados», sin acción | Sin resultados + «Limpiar filtros» | `student.catalogNoResults` | Alta |
| Catálogo sin cursos publicados | `/learn/catalog` | El mismo «Sin resultados» | Primer uso + «Jugar un Tap» | `student.catalogEmpty` | Alta |
| Mis calificaciones | `/learn/courses/:id/grades` | «Sin datos» / «No estás inscrito» / «Sin evaluaciones» | Error + reintentar / sin permisos + catálogo / informativo + volver al curso | `common.error`, `student.gradesNotEnrolled`, `student.gradesNone` | Media |
| Comunidad: anuncios | `/learn/courses/:id/community` | «Sin anuncios»; error «Sin datos» | Informativo; error + reintentar | `student.announcements` | Media |
| Comunidad: foro | `/learn/courses/:id/community` | «Sin temas», sin acción; la búsqueda caía en el mismo texto | Primer uso + «Abrir un tema»; sin resultados + borrar | `student.forum` | Media |
| Encuesta | `/learn/courses/:id/survey` | Textos genéricos | Informativo + volver; completado con foco en la acción | `student.survey`, `student.surveyDone` | Baja |
| Curso, ruta o vista previa no disponibles | `/learn/courses/:id`, `/learn/preview/...` | «Curso no encontrado», sin salida | Sin permisos + «Volver al catálogo» | `common.contentGone` | Media |
| Racha / Taps jugados | `/taps` | Zona de otra ronda (no se tocó) | Texto listo, sin aplicar | `student.tapsPlayed` | — |

### Pendiente: paneles de instructor, admin de institución y super admin

Fuera del alcance de este PR (prioridad actual: lo que ve el cliente final). Ya usan `lib-empty-state` con la API
anterior, así que heredan el nuevo arte, el foco visible y el modo claro/oscuro, pero **sus textos siguen siendo los
genéricos**. Lo que faltaría, pantalla por pantalla:

| Rol | Pantalla | Hoy | Qué faltaría |
|---|---|---|---|
| Instructor | Mis cursos sin grupos (`/instructor/courses`) | «Sin grupos asignados», sin salida | Primer uso con «Crear mi primer curso» (`/education/courses`) |
| Instructor | Autoría de cursos y rutas (`/education/*`) | «No hay cursos» + «Crear Curso»; la búsqueda usa el mismo bloque | Primer uso con el porqué; búsqueda → «Borrar búsqueda» |
| Instructor | Estudiantes, entregas, libro de calificaciones | «Sin estudiantes», «Sin evaluaciones», «Sin entregas» | Informativo con a quién acudir; «Editar el curso» para agregar quizzes |
| Instructor | Riesgo, radar, encuesta, reseñas | Textos genéricos; errores como «Sin datos» | Completado / informativo; errores con «Reintentar» |
| Instructor | Banco de preguntas | «Sin preguntas»; los filtros caen en el mismo texto | Primer uso + «Crear pregunta»; filtros → «Limpiar filtros» |
| Instructor | Estadísticas (`/instructor/stats`) | Cuatro tarjetas en cero y una sección vacía | Primer uso + «Ir a mis cursos» |
| Instructor | Anuncios del curso (vista staff) | Usa el texto del estudiante | Primer uso + «Publicar anuncio» |
| Admin | Personas y grupos (`/admin/people`) | «No hay usuarios aún» sin acción; la búsqueda deja una tabla vacía | Primer uso + «Crear usuario» / «Importar desde Excel»; sin resultados + borrar |
| Admin | Inscripciones (`/admin/enrollments`) | Formulario con contadores en cero | Primer uso con prerrequisitos (crear estudiantes / crear un curso) |
| Admin | Períodos, auditoría | «Sin períodos», «Sin operaciones» (con o sin filtros) | Primer uso + «Crear período»; filtros → «Limpiar filtros» |
| Admin | Reportes (`/admin/reports`) | Tablero de ceros; error en texto plano | Primer uso + «Inscribir estudiantes»; error + reintentar |
| Admin | Marca / home institucional, Mi institución | Líneas sueltas | Primer uso compacto; sin permisos con a quién acudir |
| Super admin | Instituciones (`/admin/institutions`) | Bloque propio; con búsqueda muestra el mismo «No hay instituciones todavía» | Primer uso + «Crear institución»; sin resultados + borrar |
| Super admin | Solicitudes (`/solicitudes`) | «Todavía no hay solicitudes.»; error en texto plano | Completado + «Ver la página pública»; error + reintentar |

Para hacerlo: sumar los bloques `instructor`, `admin` y `superAdmin` a `EMPTY_STATES` (la prueba del catálogo
valida longitudes) y cambiar cada plantilla a `[copy]`. Cualquier mención a un creador de Taps para docentes debe
esperar a que exista.

### Público

| Pantalla | Ruta | Antes | Ahora | Clave |
|---|---|---|---|---|
| Paleta de comandos (Ctrl K) | todas | «No hay resultados para esta búsqueda.» | **Pendiente**: vive en el bundle inicial; aplicar cuando se mida su peso. Texto listo | `public.search` |
| Portada sin cursos («Muy pronto publicamos…») | `/`, landing por institución | Texto suelto | **Pendiente**: archivos en edición por `feat/sistema-visual` | — |
| Retos y Bloques por categoría | `/retos`, `/bloques` | Siempre hay acertijos (vienen en el código) | Sin cambio; si llegan desde la API, usar `common.noResults` | — |
| Feed de Taps | `/taps` | Zona de otra ronda | Sin cambio | — |

## Catálogo de textos

Generado desde `empty-states.copy.ts` (si cambias un texto, cámbialo allí).

#### Comunes

| Clave | Tipo | Título | Texto | Acción | Secundaria |
|---|---|---|---|---|---|
| `common.noResults` | sin resultados | Nada coincide con esos filtros | Prueba con otra palabra o quita algunos filtros para ver más resultados. | Limpiar filtros | — |
| `common.noSearchResults` | sin resultados | Nada coincide con tu búsqueda | Revisa cómo lo escribiste o prueba con una palabra más corta. | Borrar búsqueda | — |
| `common.noSearchResultsFor` | sin resultados | Nada coincide con tu búsqueda | No encontramos «{q}». Revisa cómo lo escribiste o prueba con otra palabra. | Borrar búsqueda | — |
| `common.error` | error | No pudimos cargar esta sección | Puede ser la conexión o un fallo nuestro. Tus datos están a salvo: inténtalo de nuevo. | Reintentar | — |
| `common.noAccess` | sin permisos | Esta sección no está disponible | Tu cuenta no tiene acceso aquí. Si crees que es un error, escribe al admin de tu institución. | Volver al inicio | — |
| `common.contentGone` | sin permisos | Este contenido ya no está disponible | Puede que lo hayan retirado o que no tengas acceso. Hay más para ti en el catálogo. | Volver al catálogo | — |

#### Estudiante

| Clave | Tipo | Título | Texto | Acción | Secundaria |
|---|---|---|---|---|---|
| `student.home` | primer uso | Tu aprendizaje empieza aquí | Aún no tienes cursos. Elige uno en el catálogo o calienta con un Tap: preguntas cortas que se juegan. | Explorar el catálogo | Jugar un Tap |
| `student.myCourses` | primer uso | Todavía no tienes cursos | Cuando te inscribas en uno, aquí verás tu avance y podrás seguir donde lo dejaste. | Explorar el catálogo | Jugar un Tap |
| `student.myPaths` | informativo | Sin rutas de aprendizaje | Una ruta reúne varios cursos en orden. Cuando te inscribas en una, la verás aquí. | Ver rutas del catálogo | — |
| `student.certificates` | primer uso | Tu primer certificado te espera | Aparecen aquí al terminar un curso que los entrega. Completa uno para estrenar esta sección. | — | — |
| `student.deadlines` | completado | Sin entregas cercanas | No tienes tareas con fecha próxima. Buen momento para adelantar una lección. | — | — |
| `student.notifications` | completado | Estás al día | Aquí te avisaremos de calificaciones, anuncios y fechas de entrega. | — | — |
| `student.catalogEmpty` | primer uso | El catálogo se está llenando | Tu institución todavía no publica cursos. Mientras tanto, practica con un Tap. | Jugar un Tap | — |
| `student.catalogNoResults` | sin resultados | No hay cursos con esos filtros | Prueba con otro tipo, nivel o palabra. También puedes ver todo el catálogo. | Limpiar filtros | — |
| `student.gradesNone` | informativo | Aún no hay calificaciones | Este curso no tiene quizzes ni tareas con nota por ahora. Cuando los tenga, verás tus notas aquí. | Volver al curso | — |
| `student.gradesNotEnrolled` | sin permisos | Inscríbete para ver tus notas | Las calificaciones son personales: aparecen cuando estás inscrito en el curso. | Ver el catálogo | — |
| `student.announcements` | informativo | Sin anuncios por ahora | Cuando tu docente publique avisos del curso, los verás aquí primero. | — | — |
| `student.forum` | primer uso | Abre la conversación | Todavía no hay temas. Pregunta lo que no te quedó claro: seguro a alguien más le sirve. | Abrir un tema | — |
| `student.survey` | informativo | Este curso no tiene encuesta | Tu docente no ha publicado una encuesta de opinión. Puedes seguir con tus lecciones. | Volver a mi aprendizaje | — |
| `student.surveyDone` | completado | ¡Gracias por tu opinión! | Tus respuestas se enviaron y ayudarán a mejorar el curso. | Volver a mi aprendizaje | — |
| `student.tapsPlayed` | primer uso | Aún no has jugado Taps | Cada Tap es una pregunta corta con su explicación. Juega el primero y empieza tu racha. | Jugar un Tap | — |

#### Público

| Clave | Tipo | Título | Texto | Acción | Secundaria |
|---|---|---|---|---|---|
| `public.search` | sin resultados | Nada coincide con tu búsqueda | Prueba con el nombre de una sección, como «Catálogo» o «Mis cursos». | — | — |
