import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import {
  ICourse,
  ICourseModule,
  ILesson,
  IContentBlock,
  ICreateCourseRequest,
  IUpdateCourseRequest,
  ICreateModuleRequest,
  ICreateLessonRequest,
  ICreateContentBlockRequest,
  ICourseListResponse,
  ICourseFilters,
  ECourseStatus,
  EDifficulty,
  EContentType
} from '../../domain/model/course.model';

// ── Mock Data ─────────────────────────────────────────────────────────────────

const MOCK_COURSES: ICourse[] = [
  {
    id: 'c1',
    title: 'Introducción a la Inteligencia Artificial',
    description: 'Aprende los fundamentos del machine learning, redes neuronales y los casos de uso más relevantes de la IA en la industria actual.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&q=80',
    status: ECourseStatus.PUBLISHED,
    difficulty: EDifficulty.BEGINNER,
    tags: ['AI', 'Machine Learning', 'Python'],
    institutionId: '1',
    instructorName: 'Dr. Andrés Mora',
    enrolledCount: 3420,
    completionRate: 72,
    totalDuration: 780,
    totalLessons: 24,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-09-15'),
    publishedAt: new Date('2024-02-01'),
    modules: [
      {
        id: 'm1-1',
        title: 'Fundamentos de IA',
        description: 'Historia, conceptos y panorama actual de la inteligencia artificial.',
        order: 1,
        lessons: [
          {
            id: 'l1-1-1',
            title: '¿Qué es la Inteligencia Artificial?',
            description: 'Introducción al campo y sus aplicaciones.',
            duration: 35,
            order: 1,
            isFree: true,
            contentBlocks: [
              {
                id: 'cb1',
                type: EContentType.VIDEO,
                title: 'Panorama de la Inteligencia Artificial',
                description: 'Un recorrido completo por la historia y el estado actual de la IA.',
                duration: 20,
                order: 1,
                isRequired: true,
                url: 'https://www.youtube.com/embed/ad79nYk2keg',
                videoProvider: 'youtube',
                videoThumbnailUrl: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=400&q=70',
                videoTranscript: 'La inteligencia artificial (IA) es la simulación de procesos de inteligencia humana por sistemas informáticos. Estos procesos incluyen el aprendizaje, el razonamiento y la autocorrección...'
              },
              {
                id: 'cb2',
                type: EContentType.DOCUMENT,
                title: 'Lectura: Historia de la IA',
                duration: 15,
                order: 2,
                isRequired: true,
                markdownContent: `# Historia de la Inteligencia Artificial

## Los orígenes (1940-1960)

La inteligencia artificial como disciplina formal nació en **1956** durante la conferencia de Dartmouth, organizada por John McCarthy, Marvin Minsky, Nathaniel Rochester y Claude Shannon.

### Hitos clave

- **1950** — Alan Turing publica *Computing Machinery and Intelligence*, proponiendo el famoso **Test de Turing**
- **1956** — Nace el término "Inteligencia Artificial" en Dartmouth
- **1966** — ELIZA, el primer chatbot, desarrollado en el MIT

## El invierno de la IA (1974-1980)

> "Las máquinas serán capaces de hacer cualquier trabajo que pueda hacer un hombre dentro de 20 años" — Herbert Simon, 1965

Las expectativas superaron con creces los avances reales. La falta de progreso provocó recortes en financiamiento.

## El renacimiento (1990-presente)

Con la llegada de mayor poder computacional, grandes conjuntos de datos y nuevos algoritmos, la IA experimentó un renacimiento culminando con hitos como DeepBlue (1997), Watson (2011), AlphaGo (2016) y ChatGPT (2022).`
              }
            ]
          },
          {
            id: 'l1-1-2',
            title: 'Tipos de Aprendizaje Automático',
            description: 'Supervisado, no supervisado y por refuerzo.',
            duration: 45,
            order: 2,
            isFree: false,
            contentBlocks: [
              {
                id: 'cb3',
                type: EContentType.VIDEO,
                title: 'Aprendizaje Supervisado vs No Supervisado',
                duration: 30,
                order: 1,
                isRequired: true,
                url: 'https://www.youtube.com/embed/ujTCoH21GlA',
                videoProvider: 'youtube'
              },
              {
                id: 'cb4',
                type: EContentType.QUIZ,
                title: 'Evaluación: Tipos de ML',
                duration: 15,
                order: 2,
                isRequired: true,
                timeLimit: 15,
                passingScore: 70,
                maxAttempts: 3,
                shuffleQuestions: false,
                questions: [
                  {
                    id: 'q1',
                    type: 'multiple-choice',
                    question: '¿Cuál de los siguientes es un ejemplo de aprendizaje supervisado?',
                    points: 25,
                    order: 1,
                    options: [
                      { id: 'a', text: 'Clasificación de emails como spam o no spam' },
                      { id: 'b', text: 'Agrupación de clientes por comportamiento de compra' },
                      { id: 'c', text: 'Un agente aprendiendo a jugar ajedrez desde cero' },
                      { id: 'd', text: 'Reducción de dimensionalidad con PCA' }
                    ],
                    correctAnswers: ['a'],
                    explanation: 'El filtrado de spam es supervisado porque se entrena con ejemplos etiquetados (spam / no spam).'
                  },
                  {
                    id: 'q2',
                    type: 'true-false',
                    question: 'El aprendizaje por refuerzo requiere un conjunto de datos etiquetados para entrenarse.',
                    points: 25,
                    order: 2,
                    correctAnswer: false,
                    explanation: 'El aprendizaje por refuerzo aprende a través de la interacción con el entorno y señales de recompensa, no de datos etiquetados.'
                  },
                  {
                    id: 'q3',
                    type: 'multiple-choice',
                    question: '¿Qué algoritmos pertenecen al aprendizaje no supervisado? (Selecciona todos)',
                    points: 25,
                    order: 3,
                    allowMultiple: true,
                    options: [
                      { id: 'a', text: 'K-Means Clustering' },
                      { id: 'b', text: 'Regresión Logística' },
                      { id: 'c', text: 'DBSCAN' },
                      { id: 'd', text: 'Random Forest' }
                    ],
                    correctAnswers: ['a', 'c'],
                    explanation: 'K-Means y DBSCAN son algoritmos de clustering (no supervisado). Regresión logística y Random Forest son supervisados.'
                  },
                  {
                    id: 'q4',
                    type: 'open',
                    question: 'Explica con tus propias palabras la diferencia entre clasificación y regresión.',
                    points: 25,
                    order: 4,
                    sampleAnswer: 'Clasificación predice categorías discretas (spam/no spam), regresión predice valores continuos (precio de una casa).'
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'm1-2',
        title: 'Machine Learning con Python',
        description: 'Implementa modelos ML usando scikit-learn.',
        order: 2,
        lessons: [
          {
            id: 'l1-2-1',
            title: 'Entorno de Desarrollo',
            duration: 30,
            order: 1,
            isFree: false,
            contentBlocks: [
              {
                id: 'cb5',
                type: EContentType.VIDEO,
                title: 'Instalación de Python y Jupyter',
                duration: 20,
                order: 1,
                isRequired: true,
                url: 'https://www.youtube.com/embed/Uq5JgFiEXmM',
                videoProvider: 'youtube'
              },
              {
                id: 'cb6',
                type: EContentType.ASSIGNMENT,
                title: 'Tarea: Configura tu entorno',
                duration: 10,
                order: 2,
                isRequired: true,
                assignmentInstructions: `## Objetivo\n\nConfigura un entorno Python con las bibliotecas necesarias.\n\n## Instrucciones\n\n1. Instala Python 3.11+\n2. Crea un entorno virtual\n3. Instala numpy, pandas, scikit-learn, matplotlib, jupyter\n4. Verifica la instalación\n\n## Entrega\n\nSube una captura de pantalla con:\n- La versión de Python\n- El output de \`pip list\`\n- Jupyter corriendo en tu navegador`,
                maxScore: 100,
                allowedFileTypes: ['jpg', 'png', 'pdf'],
                rubric: [
                  { id: 'r1', criterion: 'Python instalado correctamente', maxPoints: 30 },
                  { id: 'r2', criterion: 'Bibliotecas instaladas', maxPoints: 40 },
                  { id: 'r3', criterion: 'Jupyter en ejecución', maxPoints: 30 }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'c2',
    title: 'Desarrollo Full Stack con Angular y Node.js',
    description: 'Construye aplicaciones web completas desde el frontend con Angular hasta el backend con Node.js, Express y PostgreSQL.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&q=80',
    status: ECourseStatus.PUBLISHED,
    difficulty: EDifficulty.INTERMEDIATE,
    tags: ['Angular', 'Node.js', 'TypeScript', 'Web Dev'],
    institutionId: '1',
    instructorName: 'Valentina Torres',
    enrolledCount: 2180,
    completionRate: 58,
    totalDuration: 1320,
    totalLessons: 38,
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-10-01'),
    publishedAt: new Date('2024-03-10'),
    modules: [
      {
        id: 'm2-1',
        title: 'Angular Fundamentos',
        description: 'Componentes, directivas y routing.',
        order: 1,
        lessons: [
          {
            id: 'l2-1-1',
            title: 'Arquitectura de Angular',
            duration: 40,
            order: 1,
            isFree: true,
            contentBlocks: [
              {
                id: 'cb7',
                type: EContentType.VIDEO,
                title: 'Angular Architecture Overview',
                duration: 25,
                order: 1,
                isRequired: true,
                url: 'https://www.youtube.com/embed/3dHNOWTI7H8',
                videoProvider: 'youtube'
              },
              {
                id: 'cb8',
                type: EContentType.DOCUMENT,
                title: 'Guía de Componentes Angular',
                duration: 15,
                order: 2,
                isRequired: false,
                markdownContent: `# Componentes en Angular\n\nUn componente es el **bloque fundamental** de construcción en Angular. Combina:\n- **Template HTML** — la vista\n- **Clase TypeScript** — la lógica\n- **Estilos SCSS** — el diseño\n\n## Comunicación entre Componentes\n\n| Dirección | Mecanismo |\n|-----------|----------|\n| Padre → Hijo | \`input()\` |\n| Hijo → Padre | \`output()\` |\n| Cualquiera | Service |`
              }
            ]
          }
        ]
      },
      {
        id: 'm2-2',
        title: 'Backend con Node.js y Express',
        description: 'REST APIs y autenticación JWT.',
        order: 2,
        lessons: [
          {
            id: 'l2-2-1',
            title: 'REST API con Express',
            duration: 60,
            order: 1,
            isFree: false,
            contentBlocks: [
              {
                id: 'cb9',
                type: EContentType.VIDEO,
                title: 'Creando tu primera API REST',
                duration: 45,
                order: 1,
                isRequired: true,
                url: 'https://www.youtube.com/embed/ENrzD9HAZK4',
                videoProvider: 'youtube'
              },
              {
                id: 'cb10',
                type: EContentType.ASSIGNMENT,
                title: 'Proyecto: Implementa un CRUD',
                duration: 15,
                order: 2,
                isRequired: true,
                assignmentInstructions: `## Proyecto: API REST CRUD\n\nCrea una API REST completa con Express.js.\n\n### Endpoints requeridos:\n- GET /api/items — listar\n- GET /api/items/:id — obtener\n- POST /api/items — crear\n- PUT /api/items/:id — actualizar\n- DELETE /api/items/:id — eliminar\n\n## Entrega\n\nSube un ZIP con código fuente + README + colección Postman.`,
                maxScore: 100,
                allowedFileTypes: ['zip'],
                rubric: [
                  { id: 'r1', criterion: 'Endpoints CRUD funcionales', maxPoints: 50 },
                  { id: 'r2', criterion: 'Manejo de errores', maxPoints: 20 },
                  { id: 'r3', criterion: 'Calidad del código', maxPoints: 20 },
                  { id: 'r4', criterion: 'Documentación', maxPoints: 10 }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'c3',
    title: 'Análisis de Datos con Python',
    description: 'Domina pandas, numpy, matplotlib y seaborn para analizar, visualizar y extraer insights de datos reales.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80',
    status: ECourseStatus.PUBLISHED,
    difficulty: EDifficulty.INTERMEDIATE,
    tags: ['Python', 'Data Science', 'Pandas'],
    institutionId: '2',
    instructorName: 'Prof. Carlos Gómez',
    enrolledCount: 5640,
    completionRate: 81,
    totalDuration: 960,
    totalLessons: 29,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-09-20'),
    publishedAt: new Date('2024-04-05'),
    modules: [
      {
        id: 'm3-1',
        title: 'Python para Data Science',
        description: 'NumPy, Pandas y fundamentos estadísticos.',
        order: 1,
        lessons: [
          {
            id: 'l3-1-1',
            title: 'NumPy Fundamentos',
            duration: 45,
            order: 1,
            isFree: true,
            contentBlocks: [
              {
                id: 'cb11',
                type: EContentType.VIDEO,
                title: 'Arrays y operaciones vectoriales',
                duration: 30,
                order: 1,
                isRequired: true,
                url: 'https://www.youtube.com/embed/QUT1VHiLmmI',
                videoProvider: 'youtube'
              },
              {
                id: 'cb12',
                type: EContentType.ASSIGNMENT,
                title: 'Ejercicios NumPy',
                duration: 15,
                order: 2,
                isRequired: true,
                assignmentInstructions: `## Ejercicios de NumPy\n\nSube un Jupyter Notebook con tus soluciones.\n\n1. Crea un array de 10 ceros, uno del 1 al 20 y una identidad 5x5\n2. Dado a = [1,4,9,16,25]: calcula raíz, máximo, mínimo, media\n3. De una matriz 4x4: extrae fila 2, columna 3, bloque 2x2 inferior`,
                maxScore: 100,
                allowedFileTypes: ['ipynb', 'zip']
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'c4',
    title: 'Marketing Digital y Estrategia de Contenido',
    description: 'Aprende a crear estrategias de contenido, SEO, SEM, redes sociales y analítica para hacer crecer tu marca online.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=600&q=80',
    status: ECourseStatus.DRAFT,
    difficulty: EDifficulty.BEGINNER,
    tags: ['Marketing', 'SEO', 'Contenido'],
    institutionId: '3',
    instructorName: 'Gabriela Ríos',
    enrolledCount: 0,
    completionRate: 0,
    totalDuration: 600,
    totalLessons: 18,
    createdAt: new Date('2024-10-01'),
    updatedAt: new Date('2024-10-25'),
    modules: [
      {
        id: 'm4-1',
        title: 'Fundamentos del Marketing Digital',
        description: 'Conceptos clave y ecosistema digital.',
        order: 1,
        lessons: [
          {
            id: 'l4-1-1',
            title: 'El ecosistema digital',
            duration: 35,
            order: 1,
            isFree: true,
            contentBlocks: [
              {
                id: 'cb13',
                type: EContentType.VIDEO,
                title: 'Overview del marketing digital',
                duration: 25,
                order: 1,
                isRequired: true,
                url: 'https://www.youtube.com/embed/nU-IIXBWlS4',
                videoProvider: 'youtube'
              },
              {
                id: 'cb14',
                type: EContentType.DOCUMENT,
                title: 'Glosario de términos',
                duration: 10,
                order: 2,
                isRequired: false,
                markdownContent: `# Glosario de Marketing Digital\n\n**CTR** — Click-Through Rate: % de clics sobre impresiones.\n\n**CPC** — Cost Per Click: costo por cada clic en un anuncio.\n\n**ROI** — Return on Investment: retorno sobre la inversión.\n\n**SEO** — Search Engine Optimization: optimización para buscadores.\n\n**Funnel** — Embudo de ventas: proceso desde descubrimiento hasta compra.`
              }
            ]
          }
        ]
      }
    ]
  }
];

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class CourseService {
  private readonly USE_MOCK = true;

  getCourses(filters?: ICourseFilters, page = 1, limit = 12): Observable<ICourseListResponse> {
    if (this.USE_MOCK) {
      let filtered = [...MOCK_COURSES];
      if (filters?.status) filtered = filtered.filter(c => c.status === filters.status);
      if (filters?.difficulty) filtered = filtered.filter(c => c.difficulty === filters.difficulty);
      if (filters?.search) {
        const s = filters.search.toLowerCase();
        filtered = filtered.filter(c =>
          c.title.toLowerCase().includes(s) || c.tags.some(t => t.toLowerCase().includes(s))
        );
      }
      const total = filtered.length;
      const courses = filtered.slice((page - 1) * limit, page * limit);
      return of({ courses, total, page, limit }).pipe(delay(400));
    }
    return of({ courses: [], total: 0, page, limit });
  }

  getCourseById(id: string): Observable<ICourse> {
    if (this.USE_MOCK) {
      return of(MOCK_COURSES.find(c => c.id === id)!).pipe(delay(200));
    }
    return of(MOCK_COURSES[0]);
  }

  createCourse(req: ICreateCourseRequest): Observable<ICourse> {
    if (this.USE_MOCK) {
      const course: ICourse = {
        id: `c${Date.now()}`,
        title: req.title,
        description: req.description,
        thumbnailUrl: req.thumbnailUrl,
        status: ECourseStatus.DRAFT,
        difficulty: req.difficulty,
        tags: req.tags,
        institutionId: req.institutionId ?? '1',
        modules: [],
        enrolledCount: 0,
        completionRate: 0,
        totalDuration: 0,
        totalLessons: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      MOCK_COURSES.unshift(course);
      return of(course).pipe(delay(500));
    }
    return of(MOCK_COURSES[0]);
  }

  updateCourse(id: string, req: IUpdateCourseRequest): Observable<ICourse> {
    if (this.USE_MOCK) {
      const idx = MOCK_COURSES.findIndex(c => c.id === id);
      if (idx !== -1) {
        const updated = { ...MOCK_COURSES[idx], ...req, updatedAt: new Date() };
        MOCK_COURSES[idx] = updated;
        return of(updated).pipe(delay(400));
      }
    }
    return of(MOCK_COURSES[0]);
  }

  deleteCourse(id: string): Observable<void> {
    if (this.USE_MOCK) {
      const idx = MOCK_COURSES.findIndex(c => c.id === id);
      if (idx !== -1) MOCK_COURSES.splice(idx, 1);
      return of(void 0).pipe(delay(300));
    }
    return of(void 0);
  }

  addModule(req: ICreateModuleRequest): Observable<ICourseModule> {
    if (this.USE_MOCK) {
      const course = MOCK_COURSES.find(c => c.id === req.courseId);
      if (course) {
        const mod: ICourseModule = {
          id: `m${Date.now()}`,
          title: req.title,
          description: req.description,
          lessons: [],
          order: course.modules.length + 1
        };
        course.modules.push(mod);
        course.updatedAt = new Date();
        return of(mod).pipe(delay(300));
      }
    }
    return of({} as ICourseModule);
  }

  addLesson(req: ICreateLessonRequest): Observable<ILesson> {
    if (this.USE_MOCK) {
      for (const course of MOCK_COURSES) {
        const mod = course.modules.find(m => m.id === req.moduleId);
        if (mod) {
          const lesson: ILesson = {
            id: `l${Date.now()}`,
            title: req.title,
            description: req.description,
            duration: 0,
            contentBlocks: [],
            order: mod.lessons.length + 1,
            isFree: req.isFree ?? false
          };
          mod.lessons.push(lesson);
          course.totalLessons++;
          course.updatedAt = new Date();
          return of(lesson).pipe(delay(300));
        }
      }
    }
    return of({} as ILesson);
  }

  addContentBlock(req: ICreateContentBlockRequest): Observable<IContentBlock> {
    if (this.USE_MOCK) {
      for (const course of MOCK_COURSES) {
        for (const mod of course.modules) {
          const lesson = mod.lessons.find(l => l.id === req.lessonId);
          if (lesson) {
            const block: IContentBlock = {
              id: `cb${Date.now()}`,
              type: req.type,
              title: req.title,
              duration: req.duration ?? 0,
              order: lesson.contentBlocks.length + 1,
              isRequired: req.isRequired ?? true,
              description: req.description,
              url: req.url,
              videoProvider: req.videoProvider,
              videoThumbnailUrl: req.videoThumbnailUrl,
              videoTranscript: req.videoTranscript,
              markdownContent: req.markdownContent,
              scormVersion: req.scormVersion,
              completionThreshold: req.completionThreshold,
              questions: req.questions,
              timeLimit: req.timeLimit,
              passingScore: req.passingScore,
              maxAttempts: req.maxAttempts,
              shuffleQuestions: req.shuffleQuestions,
              assignmentInstructions: req.assignmentInstructions,
              maxScore: req.maxScore,
              allowedFileTypes: req.allowedFileTypes,
              rubric: req.rubric
            };
            lesson.contentBlocks.push(block);
            lesson.duration += block.duration;
            course.totalDuration += block.duration;
            course.updatedAt = new Date();
            return of(block).pipe(delay(200));
          }
        }
      }
    }
    return of({} as IContentBlock);
  }
}
