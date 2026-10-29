import { EContentType, EDifficulty, ICreateContentBlockRequest, IRubricItem } from '../domain/model/course.model';

type TTemplateBlock = Omit<ICreateContentBlockRequest, 'lessonId'>;

export interface ICourseTemplate {
  id: string;
  title: string;
  summary: string;
  difficulty: EDifficulty;
  tags: string[];
  modules: { title: string; description?: string; lessons: { title: string; description?: string; blocks: TTemplateBlock[] }[] }[];
}

const rubric = (...items: [string, number][]): IRubricItem[] =>
  items.map(([criterion, maxPoints], i) => ({ id: `r${i + 1}`, criterion, maxPoints }));

const doc = (title: string, markdownContent: string, duration = 10): TTemplateBlock =>
  ({ type: EContentType.DOCUMENT, title, markdownContent, duration, isRequired: true });

const tarea = (title: string, assignmentInstructions: string, r: IRubricItem[], assignmentAskLink = false): TTemplateBlock =>
  ({ type: EContentType.ASSIGNMENT, title, assignmentInstructions, rubric: r, maxScore: r.reduce((s, x) => s + x.maxPoints, 0), assignmentAskLink, allowedFileTypes: ['pdf', 'docx', 'jpg'], duration: 30, isRequired: true });

const mentoria = (title: string, description: string): TTemplateBlock =>
  ({ type: EContentType.LIVE_SESSION, title, description, duration: 60, isRequired: false });

/** Plantillas de punto de partida: la institución las adapta (textos, rúbricas, fechas y enlaces de las sesiones). */
export const COURSE_TEMPLATES: ICourseTemplate[] = [
  {
    id: 'emprender-canvas',
    title: 'Emprender: de la idea al modelo Canvas',
    summary: '3 semanas: problema, validación con personas reales y un Canvas completo, con una tarea y una mentoría por etapa.',
    difficulty: EDifficulty.BEGINNER,
    tags: ['emprendimiento', 'canvas', 'validación'],
    modules: [
      {
        title: 'Semana 1 · Ideación',
        description: 'Encontrar un problema real que valga la pena resolver.',
        lessons: [{
          title: 'Un problema que valga la pena',
          blocks: [
            doc('Cómo elegir un problema', '## Empieza por el problema, no por la solución\n\nUn buen problema es **frecuente**, **doloroso** y **le pasa a alguien concreto**.\n\n- ¿A quién le pasa? Describe a esa persona.\n- ¿Qué hace hoy para resolverlo?\n- ¿Cuánto le cuesta (tiempo, dinero, estrés)?'),
            tarea('Describe tu problema', 'Escribe en una página: a quién le pasa el problema, cómo lo resuelve hoy y por qué las soluciones actuales no bastan. Incluye al menos un dato o una anécdota real.',
              rubric(['Claridad: se entiende quién y qué', 40], ['Evidencia: datos o casos reales', 30], ['Relevancia: es un problema que vale la pena', 30])),
            mentoria('Mentoría de la semana 1', 'Comparte tu problema con tu mentor y recibe preguntas para afinarlo.'),
          ],
        }],
      },
      {
        title: 'Semana 2 · Validación',
        description: 'Comprobar con personas reales que el problema existe.',
        lessons: [{
          title: 'Habla con cinco personas',
          blocks: [
            doc('Cómo hacer una entrevista de validación', '## Escucha más de lo que hablas\n\n1. Pregunta por **lo que hicieron**, no por lo que harían.\n2. No vendas tu idea durante la entrevista.\n3. Anota frases textuales.\n\nHaz **5 entrevistas** y resume lo que se repite.'),
            tarea('Resultados de tus entrevistas', 'Entrega un resumen de tus 5 entrevistas: a quién entrevistaste, tres frases textuales y qué aprendiste. Indica si tu problema se confirmó, cambió o se descartó.',
              rubric(['Cantidad y calidad de entrevistas', 30], ['Aprendizajes basados en lo que dijeron', 40], ['Decisión clara tras validar', 30])),
            mentoria('Mentoría de la semana 2', 'Revisa con tu mentor lo que aprendiste y ajusta tu idea.'),
          ],
        }],
      },
      {
        title: 'Semana 3 · Modelo Canvas',
        description: 'Armar el modelo de negocio completo.',
        lessons: [{
          title: 'Tu modelo de negocio',
          blocks: [
            doc('Los 9 bloques del Canvas', '## El Canvas en una página\n\nSegmentos de clientes · Propuesta de valor · Canales · Relación con clientes · Ingresos · Recursos clave · Actividades clave · Aliados clave · Costos.\n\nEmpieza por **segmentos y propuesta de valor**; el resto se deduce de ahí.'),
            tarea('Tu Canvas', 'Completa tu Canvas en la herramienta que prefieras (Canva, Miro, Google Docs…) y entrega el enlace con permiso de lectura.',
              rubric(['Propuesta de valor clara', 30], ['Segmentos y canales coherentes', 25], ['Ingresos y costos realistas', 25], ['Coherencia entre los 9 bloques', 20]), true),
            mentoria('Mentoría final: presenta tu Canvas', 'Presenta tu Canvas en 5 minutos y recibe retroalimentación.'),
          ],
        }],
      },
    ],
  },
  {
    id: 'proyecto-software',
    title: 'Proyecto de software por etapas',
    summary: 'Un proyecto de programación con entregas del enlace al repositorio en cada etapa y una demo final con el mentor.',
    difficulty: EDifficulty.INTERMEDIATE,
    tags: ['programación', 'proyecto', 'web'],
    modules: [
      {
        title: 'Etapa 1 · Fundamentos',
        description: 'Practicar lo básico dentro de la lección, con un editor de código incrustado.',
        lessons: [{
          title: 'Practica en el editor',
          blocks: [
            doc('Tu primer ejercicio', '## Practica aquí mismo\n\nEl mentor puede incrustar un proyecto de StackBlitz, CodePen o CodeSandbox debajo de este texto (edita el bloque y pega el enlace).\n\nCambia el código, mira el resultado y prueba cosas.'),
          ],
        }],
      },
      {
        title: 'Etapa 2 · Proyecto',
        description: 'Construir el proyecto y entregarlo por partes.',
        lessons: [
          {
            title: 'Repositorio inicial',
            blocks: [
              tarea('Entrega 1: tu repositorio', 'Crea un repositorio con un README que explique qué hará tu proyecto y entrega el enlace.',
                rubric(['README claro', 40], ['Idea del proyecto bien definida', 40], ['Repositorio ordenado', 20]), true),
            ],
          },
          {
            title: 'Entrega parcial',
            blocks: [
              tarea('Entrega 2: avance funcionando', 'Entrega el enlace a tu avance funcionando y un párrafo con lo que falta y lo que fue difícil.',
                rubric(['Funciona lo prometido', 40], ['Calidad del código', 30], ['Honestidad sobre lo pendiente', 30]), true),
              mentoria('Revisión de código con el mentor', 'Muestra tu avance y recibe comentarios sobre tu código.'),
            ],
          },
        ],
      },
      {
        title: 'Etapa 3 · Entrega final',
        description: 'Terminar, publicar y presentar.',
        lessons: [{
          title: 'Demo final',
          blocks: [
            tarea('Entrega final', 'Entrega el enlace al proyecto terminado (publicado o con instrucciones para correrlo) y un video corto o capturas.',
              rubric(['Proyecto terminado y funcional', 40], ['Calidad del código y orden', 30], ['Presentación y explicación', 30]), true),
            mentoria('Demo final', 'Presenta tu proyecto en 5 minutos.'),
          ],
        }],
      },
    ],
  },
];
