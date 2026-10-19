import type { EmptyStateIcon } from './empty-state.icons';

/**
 * Tipos de estado vacío (guía completa en projects/shared/ESTADOS-VACIOS.md):
 * - first-use: la sección nunca ha tenido datos. Enseña qué es y lleva al primer paso.
 * - no-results: hay datos, pero la búsqueda o los filtros no encuentran nada. Ofrece «Limpiar filtros».
 * - done: no queda nada pendiente. Celebra y sugiere qué hacer después.
 * - no-access: el rol o la inscripción no permite ver la sección. Dice a quién acudir.
 * - error: no se pudo cargar. Ofrece reintentar (el detalle del error vive en el patrón de estados de carga).
 * - info: vacío que la persona no puede resolver desde aquí (depende de otros). Explica cuándo se llenará.
 */
export type EmptyStateKind = 'first-use' | 'no-results' | 'done' | 'no-access' | 'error' | 'info';

/** Textos de un estado vacío. Límites: título ≤ 40, descripción ≤ 120, botones ≤ 24 caracteres. */
export interface EmptyStateCopy {
  readonly kind: EmptyStateKind;
  readonly icon: EmptyStateIcon;
  readonly title: string;
  readonly description: string;
  /** Acción principal (el siguiente paso). */
  readonly action?: string;
  /** Acción secundaria opcional (alternativa más ligera). */
  readonly secondary?: string;
}

export const EMPTY_STATE_LIMITS = { title: 40, description: 120, action: 24 } as const;

/**
 * Catálogo único de textos de estados vacíos, por rol. Está en español y el componente los pasa por
 * I18nService (la clave de traducción es el propio texto), así que traducirlos es sumar entradas en
 * shared/core/i18n/translations.ts sin tocar las pantallas. Los marcadores {n} se reemplazan con `params`.
 *
 * Taps: los estados que lo mencionan enlazan a /taps (ya existe).
 * Alcance actual: visitante y estudiante. Los textos de instructor y admin quedan pendientes (ver la guía).
 */
export const EMPTY_STATES = {
  common: {
    noResults: {
      kind: 'no-results', icon: 'filter',
      title: 'Nada coincide con esos filtros',
      description: 'Prueba con otra palabra o quita algunos filtros para ver más resultados.',
      action: 'Limpiar filtros',
    },
    noSearchResults: {
      kind: 'no-results', icon: 'search',
      title: 'Nada coincide con tu búsqueda',
      description: 'Revisa cómo lo escribiste o prueba con una palabra más corta.',
      action: 'Borrar búsqueda',
    },
    noSearchResultsFor: {
      kind: 'no-results', icon: 'search',
      title: 'Nada coincide con tu búsqueda',
      description: 'No encontramos «{q}». Revisa cómo lo escribiste o prueba con otra palabra.',
      action: 'Borrar búsqueda',
    },
    error: {
      kind: 'error', icon: 'alert',
      title: 'No pudimos cargar esta sección',
      description: 'Puede ser la conexión o un fallo nuestro. Tus datos están a salvo: inténtalo de nuevo.',
      action: 'Reintentar',
    },
    noAccess: {
      kind: 'no-access', icon: 'lock',
      title: 'Esta sección no está disponible',
      description: 'Tu cuenta no tiene acceso aquí. Si crees que es un error, escribe al admin de tu institución.',
      action: 'Volver al inicio',
    },
    contentGone: {
      kind: 'no-access', icon: 'lock',
      title: 'Este contenido ya no está disponible',
      description: 'Puede que lo hayan retirado o que no tengas acceso. Hay más para ti en el catálogo.',
      action: 'Volver al catálogo',
    },
  },

  student: {
    home: {
      kind: 'first-use', icon: 'compass',
      title: 'Tu aprendizaje empieza aquí',
      description: 'Aún no tienes cursos. Elige uno en el catálogo o calienta con un Tap: preguntas cortas que se juegan.',
      action: 'Explorar el catálogo',
      secondary: 'Jugar un Tap',
    },
    myCourses: {
      kind: 'first-use', icon: 'book',
      title: 'Todavía no tienes cursos',
      description: 'Cuando te inscribas en uno, aquí verás tu avance y podrás seguir donde lo dejaste.',
      action: 'Explorar el catálogo',
      secondary: 'Jugar un Tap',
    },
    myPaths: {
      kind: 'info', icon: 'route',
      title: 'Sin rutas de aprendizaje',
      description: 'Una ruta reúne varios cursos en orden. Cuando te inscribas en una, la verás aquí.',
      action: 'Ver rutas del catálogo',
    },
    certificates: {
      kind: 'first-use', icon: 'award',
      title: 'Tu primer certificado te espera',
      description: 'Aparecen aquí al terminar un curso que los entrega. Completa uno para estrenar esta sección.',
    },
    deadlines: {
      kind: 'done', icon: 'calendar',
      title: 'Sin entregas cercanas',
      description: 'No tienes tareas con fecha próxima. Buen momento para adelantar una lección.',
    },
    notifications: {
      kind: 'done', icon: 'bell',
      title: 'Estás al día',
      description: 'Aquí te avisaremos de calificaciones, anuncios y fechas de entrega.',
    },
    catalogEmpty: {
      kind: 'first-use', icon: 'book',
      title: 'El catálogo se está llenando',
      description: 'Tu institución todavía no publica cursos. Mientras tanto, practica con un Tap.',
      action: 'Jugar un Tap',
    },
    catalogNoResults: {
      kind: 'no-results', icon: 'filter',
      title: 'No hay cursos con esos filtros',
      description: 'Prueba con otro tipo, nivel o palabra. También puedes ver todo el catálogo.',
      action: 'Limpiar filtros',
    },
    gradesNone: {
      kind: 'info', icon: 'grading',
      title: 'Aún no hay calificaciones',
      description: 'Este curso no tiene quizzes ni tareas con nota por ahora. Cuando los tenga, verás tus notas aquí.',
      action: 'Volver al curso',
    },
    gradesNotEnrolled: {
      kind: 'no-access', icon: 'lock',
      title: 'Inscríbete para ver tus notas',
      description: 'Las calificaciones son personales: aparecen cuando estás inscrito en el curso.',
      action: 'Ver el catálogo',
    },
    announcements: {
      kind: 'info', icon: 'megaphone',
      title: 'Sin anuncios por ahora',
      description: 'Cuando tu docente publique avisos del curso, los verás aquí primero.',
    },
    forum: {
      kind: 'first-use', icon: 'forum',
      title: 'Abre la conversación',
      description: 'Todavía no hay temas. Pregunta lo que no te quedó claro: seguro a alguien más le sirve.',
      action: 'Abrir un tema',
    },
    survey: {
      kind: 'info', icon: 'list',
      title: 'Este curso no tiene encuesta',
      description: 'Tu docente no ha publicado una encuesta de opinión. Puedes seguir con tus lecciones.',
      action: 'Volver a mi aprendizaje',
    },
    surveyDone: {
      kind: 'done', icon: 'trophy',
      title: '¡Gracias por tu opinión!',
      description: 'Tus respuestas se enviaron y ayudarán a mejorar el curso.',
      action: 'Volver a mi aprendizaje',
    },
    tapsPlayed: {
      kind: 'first-use', icon: 'tap',
      title: 'Aún no has jugado Taps',
      description: 'Cada Tap es una pregunta corta con su explicación. Juega el primero y empieza tu racha.',
      action: 'Jugar un Tap',
    },
  },

  public: {
    search: {
      kind: 'no-results', icon: 'search',
      title: 'Nada coincide con tu búsqueda',
      description: 'Prueba con el nombre de una sección, como «Catálogo» o «Mis cursos».',
    },
  },
} as const satisfies Record<string, Record<string, EmptyStateCopy>>;
