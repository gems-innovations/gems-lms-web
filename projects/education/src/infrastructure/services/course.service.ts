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
                description: 'Componentes, módulos, servicios e inyección de dependencias: cómo encajan las piezas de Angular.',
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
                description: 'Construye paso a paso una API con Express: rutas, middlewares y manejo de errores.',
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
      },
      {
        id: 'm2-3',
        title: 'Bases de Datos con PostgreSQL',
        description: 'Diseño relacional, consultas SQL y conexión con Node.js.',
        order: 3,
        lessons: [
          {
            id: 'l2-3-1',
            title: 'Introducción a PostgreSQL',
            duration: 50,
            order: 1,
            isFree: false,
            contentBlocks: [
              {
                id: 'cb20',
                type: EContentType.VIDEO,
                title: 'Instalación y primeros pasos con PostgreSQL',
                description: 'Instala PostgreSQL, crea tu primera base de datos y ejecuta consultas básicas.',
                duration: 35,
                order: 1,
                isRequired: true,
                url: 'https://www.youtube.com/embed/qw--VYLpxG4',
                videoProvider: 'youtube'
              },
              {
                id: 'cb21',
                type: EContentType.DOCUMENT,
                title: 'Comandos SQL Esenciales',
                duration: 15,
                order: 2,
                isRequired: false,
                markdownContent: `# SQL Esencial\n\n## DDL — Definición de estructura\n\n\`\`\`sql\nCREATE TABLE users (\n  id SERIAL PRIMARY KEY,\n  email VARCHAR(255) UNIQUE NOT NULL,\n  created_at TIMESTAMP DEFAULT NOW()\n);\n\`\`\`\n\n## DML — Manipulación de datos\n\n\`\`\`sql\nINSERT INTO users (email) VALUES ('test@example.com');\nSELECT * FROM users WHERE id = 1;\nUPDATE users SET email = 'new@example.com' WHERE id = 1;\nDELETE FROM users WHERE id = 1;\n\`\`\`\n\n## JOINs\n\n| Tipo | Descripción |\n|------|-------------|\n| INNER JOIN | Solo coincidencias en ambas tablas |\n| LEFT JOIN  | Todas las filas de la izquierda |\n| RIGHT JOIN | Todas las filas de la derecha |`
              }
            ]
          },
          {
            id: 'l2-3-2',
            title: 'ORM con Prisma',
            duration: 55,
            order: 2,
            isFree: false,
            contentBlocks: [
              {
                id: 'cb22',
                type: EContentType.VIDEO,
                title: 'Prisma ORM desde cero',
                description: 'Modela tu esquema, ejecuta migraciones y consulta datos con el cliente tipado de Prisma.',
                duration: 40,
                order: 1,
                isRequired: true,
                url: 'https://www.youtube.com/embed/RebA5J-rlwg',
                videoProvider: 'youtube'
              },
              {
                id: 'cb23',
                type: EContentType.QUIZ,
                title: 'Evaluación: Bases de Datos',
                duration: 15,
                order: 2,
                isRequired: true,
                timeLimit: 15,
                passingScore: 70,
                maxAttempts: 3,
                shuffleQuestions: false,
                questions: [
                  {
                    id: 'q-db1',
                    type: 'multiple-choice',
                    question: '¿Qué comando Prisma genera el cliente a partir del schema?',
                    points: 50,
                    order: 1,
                    options: [
                      { id: 'a', text: 'prisma generate' },
                      { id: 'b', text: 'prisma migrate dev' },
                      { id: 'c', text: 'prisma db push' },
                      { id: 'd', text: 'prisma init' }
                    ],
                    correctAnswers: ['a'],
                    explanation: '`prisma generate` lee el schema y genera el Prisma Client tipado.'
                  },
                  {
                    id: 'q-db2',
                    type: 'true-false',
                    question: 'Una PRIMARY KEY puede contener valores NULL.',
                    points: 50,
                    order: 2,
                    correctAnswer: false,
                    explanation: 'Las PRIMARY KEY deben ser únicas y NOT NULL por definición.'
                  }
                ]
              }
            ]
          },
          {
            id: 'l2-3-3',
            title: 'Proyecto: API con Base de Datos',
            duration: 90,
            order: 3,
            isFree: false,
            contentBlocks: [
              {
                id: 'cb24',
                type: EContentType.ASSIGNMENT,
                title: 'Integra PostgreSQL en tu API',
                duration: 90,
                order: 1,
                isRequired: true,
                assignmentInstructions: `## Proyecto: API + PostgreSQL\n\nExtiende tu API REST para usar PostgreSQL con Prisma.\n\n### Requisitos\n- Schema Prisma con al menos 2 modelos relacionados\n- Migraciones aplicadas\n- Todos los endpoints CRUD usando Prisma Client\n- Variables de entorno para DATABASE_URL\n\n## Entrega\nRepositorio GitHub con README que incluya instrucciones de setup.`,
                maxScore: 100,
                allowedFileTypes: ['zip', 'txt'],
                rubric: [
                  { id: 'r-db1', criterion: 'Schema Prisma correcto', maxPoints: 30 },
                  { id: 'r-db2', criterion: 'Operaciones CRUD con Prisma', maxPoints: 40 },
                  { id: 'r-db3', criterion: 'Manejo de relaciones', maxPoints: 30 }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'm2-4',
        title: 'Autenticación y Seguridad',
        description: 'JWT, bcrypt, guards y middleware de seguridad.',
        order: 4,
        lessons: [
          {
            id: 'l2-4-1',
            title: 'Autenticación con JWT',
            duration: 65,
            order: 1,
            isFree: false,
            contentBlocks: [
              {
                id: 'cb25',
                type: EContentType.VIDEO,
                title: 'JSON Web Tokens explicado',
                description: 'Qué es un JWT, cómo se firma y por qué es el estándar para autenticación stateless.',
                duration: 30,
                order: 1,
                isRequired: true,
                url: 'https://www.youtube.com/embed/7Q17ubqLfaM',
                videoProvider: 'youtube'
              },
              {
                id: 'cb26',
                type: EContentType.VIDEO,
                title: 'Implementando Login y Register',
                description: 'Endpoints de registro y login con bcrypt para hashear contraseñas y emisión de tokens.',
                duration: 35,
                order: 2,
                isRequired: true,
                url: 'https://www.youtube.com/embed/mbsmsi7l3r4',
                videoProvider: 'youtube'
              }
            ]
          },
          {
            id: 'l2-4-2',
            title: 'Guards en Angular',
            duration: 45,
            order: 2,
            isFree: false,
            contentBlocks: [
              {
                id: 'cb27',
                type: EContentType.VIDEO,
                title: 'Route Guards y CanActivate',
                description: 'Protege rutas de tu aplicación Angular con guards funcionales y redirecciones.',
                duration: 30,
                order: 1,
                isRequired: true,
                url: 'https://www.youtube.com/embed/kDEl6yn4cBE',
                videoProvider: 'youtube'
              },
              {
                id: 'cb28',
                type: EContentType.DOCUMENT,
                title: 'Interceptors HTTP en Angular',
                duration: 15,
                order: 2,
                isRequired: false,
                markdownContent: `# HTTP Interceptors\n\nLos interceptors permiten modificar cada petición HTTP de forma global.\n\n## Caso de uso típico: agregar el token JWT\n\n\`\`\`typescript\nexport const authInterceptor: HttpInterceptorFn = (req, next) => {\n  const token = inject(AuthService).token();\n  if (!token) return next(req);\n\n  const authReq = req.clone({\n    headers: req.headers.set('Authorization', \`Bearer \${token}\`)\n  });\n  return next(authReq);\n};\n\`\`\`\n\n> Registra el interceptor en \`app.config.ts\` con \`provideHttpClient(withInterceptors([authInterceptor]))\`.`
              }
            ]
          }
        ]
      },
      {
        id: 'm2-5',
        title: 'Deploy y DevOps',
        description: 'Docker, CI/CD y despliegue en producción.',
        order: 5,
        lessons: [
          {
            id: 'l2-5-1',
            title: 'Dockerizando tu aplicación',
            duration: 55,
            order: 1,
            isFree: false,
            contentBlocks: [
              {
                id: 'cb29',
                type: EContentType.VIDEO,
                title: 'Docker para desarrolladores Node.js',
                description: 'Imágenes, contenedores y volúmenes: empaqueta tu API Node.js con Docker.',
                duration: 40,
                order: 1,
                isRequired: true,
                url: 'https://www.youtube.com/embed/9zUHg7xjIqQ',
                videoProvider: 'youtube'
              },
              {
                id: 'cb30',
                type: EContentType.DOCUMENT,
                title: 'Dockerfile y docker-compose.yml',
                duration: 15,
                order: 2,
                isRequired: false,
                markdownContent: `# Dockerfile para Node.js\n\n\`\`\`dockerfile\nFROM node:20-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --only=production\nCOPY . .\nEXPOSE 3000\nCMD ["node", "src/index.js"]\n\`\`\`\n\n## docker-compose.yml\n\n\`\`\`yaml\nservices:\n  api:\n    build: .\n    ports:\n      - "3000:3000"\n    environment:\n      DATABASE_URL: postgresql://user:pass@db:5432/mydb\n    depends_on:\n      - db\n  db:\n    image: postgres:16-alpine\n    environment:\n      POSTGRES_PASSWORD: pass\n      POSTGRES_USER: user\n      POSTGRES_DB: mydb\n\`\`\`\n`
              }
            ]
          },
          {
            id: 'l2-5-2',
            title: 'CI/CD con GitHub Actions',
            duration: 50,
            order: 2,
            isFree: false,
            contentBlocks: [
              {
                id: 'cb31',
                type: EContentType.VIDEO,
                title: 'GitHub Actions desde cero',
                description: 'Crea workflows de CI/CD que ejecutan tests y despliegan automáticamente en cada push.',
                duration: 35,
                order: 1,
                isRequired: true,
                url: 'https://www.youtube.com/embed/R8_veQiYBjI',
                videoProvider: 'youtube'
              }
            ]
          },
          {
            id: 'l2-5-3',
            title: 'Proyecto Final: App Full Stack en Producción',
            duration: 120,
            order: 3,
            isFree: false,
            contentBlocks: [
              {
                id: 'cb32',
                type: EContentType.ASSIGNMENT,
                title: 'Despliega tu aplicación completa',
                duration: 120,
                order: 1,
                isRequired: true,
                assignmentInstructions: `## Proyecto Final\n\nDespliega una aplicación Full Stack completa que integre todo lo aprendido.\n\n### Stack requerido\n- **Frontend**: Angular con routing y guards\n- **Backend**: Express + Prisma + PostgreSQL\n- **Auth**: JWT con refresh tokens\n- **Deploy**: Docker + cualquier plataforma cloud\n\n### Entrega\nURL pública de la aplicación + repositorio GitHub.`,
                maxScore: 100,
                allowedFileTypes: ['txt', 'zip'],
                rubric: [
                  { id: 'r-f1', criterion: 'Frontend Angular funcional', maxPoints: 25 },
                  { id: 'r-f2', criterion: 'API REST completa', maxPoints: 25 },
                  { id: 'r-f3', criterion: 'Autenticación JWT', maxPoints: 25 },
                  { id: 'r-f4', criterion: 'Deploy en producción', maxPoints: 25 }
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
    averageRating: 4.7,
    ratingCount: 1284,
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
      },
      {
        id: 'm3-2',
        title: 'Análisis Exploratorio de Datos',
        description: 'Limpieza, visualización y estadística descriptiva con pandas y matplotlib.',
        order: 2,
        lessons: [
          {
            id: 'l3-2-1',
            title: 'Carga y limpieza de datasets',
            duration: 40,
            order: 1,
            isFree: true,
            contentBlocks: [
              {
                id: 'cb21',
                type: EContentType.VIDEO,
                title: 'pandas read_csv, dropna, fillna',
                duration: 25,
                order: 1,
                isRequired: true,
                url: 'https://www.youtube.com/embed/QUT1VHiLmmI',
                videoProvider: 'youtube'
              },
              {
                id: 'cb22',
                type: EContentType.DOCUMENT,
                title: 'Guía de referencia: operaciones con DataFrames',
                duration: 15,
                order: 2,
                isRequired: false
              }
            ]
          },
          {
            id: 'l3-2-2',
            title: 'Visualización con Matplotlib y Seaborn',
            duration: 50,
            order: 2,
            isFree: false,
            contentBlocks: [
              {
                id: 'cb23',
                type: EContentType.VIDEO,
                title: 'Gráficas de dispersión, histogramas y heatmaps',
                duration: 35,
                order: 1,
                isRequired: true,
                url: 'https://www.youtube.com/embed/QUT1VHiLmmI',
                videoProvider: 'youtube'
              },
              {
                id: 'cb24',
                type: EContentType.QUIZ,
                title: 'Quiz: pandas y visualización',
                duration: 15,
                order: 2,
                isRequired: true,
                questions: [
                  { id: 'q1', question: '¿Qué método devuelve estadísticas descriptivas de un DataFrame?', type: 'multiple-choice' as const, options: [{ id: 'a', text: 'df.info()' }, { id: 'b', text: 'df.describe()' }, { id: 'c', text: 'df.stats()' }], correctAnswers: ['b'], points: 10, order: 1 }
                ]
              }
            ]
          },
          {
            id: 'l3-2-3',
            title: 'Estadística descriptiva aplicada',
            duration: 35,
            order: 3,
            isFree: false,
            contentBlocks: [
              {
                id: 'cb25',
                type: EContentType.VIDEO,
                title: 'Media, mediana, varianza y correlaciones',
                duration: 35,
                order: 1,
                isRequired: true,
                url: 'https://www.youtube.com/embed/QUT1VHiLmmI',
                videoProvider: 'youtube'
              }
            ]
          }
        ]
      },
      {
        id: 'm3-3',
        title: 'Machine Learning con Scikit-Learn',
        description: 'Regresión, clasificación, validación cruzada y pipelines de ML.',
        order: 3,
        lessons: [
          {
            id: 'l3-3-1',
            title: 'Introducción al aprendizaje supervisado',
            duration: 45,
            order: 1,
            isFree: true,
            contentBlocks: [
              {
                id: 'cb31',
                type: EContentType.VIDEO,
                title: 'Train/test split, métricas y overfitting',
                duration: 30,
                order: 1,
                isRequired: true,
                url: 'https://www.youtube.com/embed/QUT1VHiLmmI',
                videoProvider: 'youtube'
              },
              {
                id: 'cb32',
                type: EContentType.DOCUMENT,
                title: 'Conceptos clave: bias-variance tradeoff',
                duration: 15,
                order: 2,
                isRequired: false
              }
            ]
          },
          {
            id: 'l3-3-2',
            title: 'Regresión lineal y logística',
            duration: 55,
            order: 2,
            isFree: false,
            contentBlocks: [
              {
                id: 'cb33',
                type: EContentType.VIDEO,
                title: 'Implementación con sklearn y evaluación',
                duration: 40,
                order: 1,
                isRequired: true,
                url: 'https://www.youtube.com/embed/QUT1VHiLmmI',
                videoProvider: 'youtube'
              },
              {
                id: 'cb34',
                type: EContentType.ASSIGNMENT,
                title: 'Proyecto: predicción de precios de vivienda',
                duration: 15,
                order: 2,
                isRequired: true,
                assignmentInstructions: '## Predicción con regresión\n\nUsa el dataset de Boston Housing para entrenar un modelo de regresión lineal. Reporta R², MAE y RMSE.',
                maxScore: 100,
                allowedFileTypes: ['ipynb', 'zip']
              }
            ]
          },
          {
            id: 'l3-3-3',
            title: 'Árboles de decisión y Random Forest',
            duration: 60,
            order: 3,
            isFree: false,
            contentBlocks: [
              {
                id: 'cb35',
                type: EContentType.VIDEO,
                title: 'Ensemble methods y feature importance',
                duration: 45,
                order: 1,
                isRequired: true,
                url: 'https://www.youtube.com/embed/QUT1VHiLmmI',
                videoProvider: 'youtube'
              },
              {
                id: 'cb36',
                type: EContentType.QUIZ,
                title: 'Quiz: árboles y ensembles',
                duration: 15,
                order: 2,
                isRequired: true,
                questions: [
                  { id: 'q2', question: '¿Qué técnica reduce la varianza combinando múltiples árboles?', type: 'multiple-choice' as const, options: [{ id: 'a', text: 'Boosting' }, { id: 'b', text: 'Bagging (Random Forest)' }, { id: 'c', text: 'Pruning' }], correctAnswers: ['b'], points: 10, order: 1 }
                ]
              }
            ]
          },
          {
            id: 'l3-3-4',
            title: 'Pipelines y Cross-Validation',
            duration: 40,
            order: 4,
            isFree: false,
            contentBlocks: [
              {
                id: 'cb37',
                type: EContentType.VIDEO,
                title: 'Pipeline de preprocesamiento + modelo + CV',
                duration: 40,
                order: 1,
                isRequired: true,
                url: 'https://www.youtube.com/embed/QUT1VHiLmmI',
                videoProvider: 'youtube'
              }
            ]
          }
        ]
      },
      {
        id: 'm3-4',
        title: 'Proyecto Final: Pipeline de Datos End-to-End',
        description: 'Integra todo lo aprendido en un pipeline completo: ingesta, EDA, modelo y dashboard.',
        order: 4,
        lessons: [
          {
            id: 'l3-4-1',
            title: 'Definición del problema y dataset',
            duration: 30,
            order: 1,
            isFree: false,
            contentBlocks: [
              {
                id: 'cb41',
                type: EContentType.VIDEO,
                title: 'Planteamiento del caso de negocio',
                duration: 30,
                order: 1,
                isRequired: true,
                url: 'https://www.youtube.com/embed/QUT1VHiLmmI',
                videoProvider: 'youtube'
              }
            ]
          },
          {
            id: 'l3-4-2',
            title: 'Implementación del pipeline',
            duration: 90,
            order: 2,
            isFree: false,
            contentBlocks: [
              {
                id: 'cb42',
                type: EContentType.ASSIGNMENT,
                title: 'Entrega final: pipeline completo',
                duration: 90,
                order: 1,
                isRequired: true,
                assignmentInstructions: '## Proyecto Final\n\nEntrega un Jupyter Notebook con:\n1. Ingesta y limpieza de datos\n2. EDA con al menos 5 visualizaciones\n3. Modelo entrenado y evaluado con CV\n4. Conclusiones y próximos pasos',
                maxScore: 100,
                allowedFileTypes: ['ipynb', 'zip', 'pdf']
              }
            ]
          },
          {
            id: 'l3-4-3',
            title: 'Presentación de resultados',
            duration: 20,
            order: 3,
            isFree: false,
            contentBlocks: [
              {
                id: 'cb43',
                type: EContentType.VIDEO,
                title: 'Cómo comunicar hallazgos de datos',
                duration: 20,
                order: 1,
                isRequired: true,
                url: 'https://www.youtube.com/embed/QUT1VHiLmmI',
                videoProvider: 'youtube'
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
  },
  {
    id: 'c5',
    title: 'Machine Learning Avanzado con TensorFlow',
    description: 'Domina redes neuronales profundas, CNNs, RNNs y transformers con TensorFlow y Keras para proyectos reales de producción.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1555255707-c07966088b7b?w=600&q=80',
    status: ECourseStatus.PUBLISHED,
    difficulty: EDifficulty.ADVANCED,
    tags: ['TensorFlow', 'Deep Learning', 'Python'],
    institutionId: '1',
    instructorName: 'Dr. Andrés Mora',
    enrolledCount: 4120,
    completionRate: 68,
    totalDuration: 1080,
    totalLessons: 32,
    averageRating: 4.9,
    ratingCount: 980,
    createdAt: new Date('2024-05-01'),
    updatedAt: new Date('2024-11-10'),
    publishedAt: new Date('2024-06-01'),
    modules: [{ id: 'm5-1', title: 'Introducción a TensorFlow', order: 1, lessons: [] }]
  },
  {
    id: 'c6',
    title: 'Despliegue de Modelos en Producción',
    description: 'Aprende a empaquetar, versionar y servir modelos de ML usando Docker, FastAPI, Kubernetes y pipelines de CI/CD.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&q=80',
    status: ECourseStatus.PUBLISHED,
    difficulty: EDifficulty.ADVANCED,
    tags: ['MLOps', 'Docker', 'Kubernetes'],
    institutionId: '1',
    instructorName: 'Valentina Torres',
    enrolledCount: 2870,
    completionRate: 59,
    totalDuration: 540,
    totalLessons: 15,
    averageRating: 4.6,
    ratingCount: 620,
    createdAt: new Date('2024-06-15'),
    updatedAt: new Date('2024-11-20'),
    publishedAt: new Date('2024-07-01'),
    modules: [{ id: 'm6-1', title: 'Fundamentos de MLOps', order: 1, lessons: [] }]
  },
  {
    id: 'c7',
    title: 'React y Next.js: De Cero a Producción',
    description: 'Construye aplicaciones web modernas con React 18, hooks, Context, y Next.js 14 con App Router, SSR y despliegue en Vercel.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1633356122102-3fe601e05bd2?w=600&q=80',
    status: ECourseStatus.PUBLISHED,
    difficulty: EDifficulty.INTERMEDIATE,
    tags: ['React', 'Next.js', 'JavaScript'],
    institutionId: '2',
    instructorName: 'Luis Herrera',
    enrolledCount: 6340,
    completionRate: 77,
    totalDuration: 900,
    totalLessons: 26,
    averageRating: 4.8,
    ratingCount: 1890,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-10-30'),
    publishedAt: new Date('2024-03-01'),
    modules: [{ id: 'm7-1', title: 'Fundamentos de React', order: 1, lessons: [] }]
  },
  {
    id: 'c8',
    title: 'AWS Cloud Practitioner + Solutions Architect',
    description: 'Domina los servicios core de AWS: EC2, S3, RDS, Lambda, VPC y más. Preparación para la certificación Solutions Architect Associate.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600&q=80',
    status: ECourseStatus.PUBLISHED,
    difficulty: EDifficulty.INTERMEDIATE,
    tags: ['AWS', 'Cloud', 'DevOps'],
    institutionId: '2',
    instructorName: 'Roberto Salinas',
    enrolledCount: 3980,
    completionRate: 64,
    totalDuration: 1200,
    totalLessons: 35,
    averageRating: 4.7,
    ratingCount: 1120,
    createdAt: new Date('2024-03-15'),
    updatedAt: new Date('2024-11-05'),
    publishedAt: new Date('2024-04-15'),
    modules: [{ id: 'm8-1', title: 'Introducción a AWS', order: 1, lessons: [] }]
  },
  {
    id: 'c9',
    title: 'UX/UI Design: Figma a Producto Real',
    description: 'Aprende diseño de interfaces desde cero con Figma, sistemas de diseño, pruebas de usabilidad y handoff a desarrollo.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&q=80',
    status: ECourseStatus.PUBLISHED,
    difficulty: EDifficulty.BEGINNER,
    tags: ['UX', 'UI', 'Figma'],
    institutionId: '3',
    instructorName: 'Camila Rondón',
    enrolledCount: 5210,
    completionRate: 83,
    totalDuration: 720,
    totalLessons: 22,
    averageRating: 4.9,
    ratingCount: 2340,
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-10-15'),
    publishedAt: new Date('2024-02-15'),
    modules: [{ id: 'm9-1', title: 'Fundamentos de UX', order: 1, lessons: [] }]
  },

  // ── Curso casi completo (demo finalizar y certificado) ───────────────────────
  {
    id: 'c-almost',
    title: 'Docker y Contenedores desde Cero',
    description: 'Aprende a contenerizar aplicaciones con Docker: imágenes, volúmenes, redes, Docker Compose y buenas prácticas para ambientes de desarrollo y producción.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1605745341112-85968b19335b?w=600&q=80',
    status: ECourseStatus.PUBLISHED,
    difficulty: EDifficulty.INTERMEDIATE,
    tags: ['Docker', 'DevOps', 'Contenedores'],
    institutionId: '1',
    instructorName: 'Andrea Ramírez',
    enrolledCount: 5100,
    completionRate: 78,
    totalDuration: 120,
    totalLessons: 3,
    averageRating: 4.7,
    ratingCount: 920,
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2025-01-10'),
    publishedAt: new Date('2024-06-15'),
    modules: [
      {
        id: 'ma-1',
        title: 'Fundamentos de Docker',
        order: 1,
        lessons: [
          {
            id: 'la-1-1',
            title: 'Conceptos básicos y primera imagen',
            duration: 40,
            order: 1,
            isFree: true,
            contentBlocks: [
              {
                id: 'cba-1',
                type: EContentType.VIDEO,
                title: '¿Qué es Docker y cómo funciona?',
                duration: 20,
                order: 1,
                isRequired: true,
                description: 'Introducción a contenedores, diferencias con VMs y arquitectura de Docker.',
                url: 'https://www.youtube.com/watch?v=3c-iBn73dDE',
                videoProvider: 'youtube',
              },
              {
                id: 'cba-2',
                type: EContentType.DOCUMENT,
                title: 'Guía: comandos esenciales de Docker',
                duration: 20,
                order: 2,
                isRequired: true,
                markdownContent: `# Comandos esenciales de Docker\n\n## Imágenes\n\n\`\`\`bash\ndocker pull nginx          # descargar imagen\ndocker images              # listar imágenes\ndocker rmi nginx           # eliminar imagen\n\`\`\`\n\n## Contenedores\n\n\`\`\`bash\ndocker run -d -p 80:80 nginx   # ejecutar en background\ndocker ps                      # contenedores activos\ndocker stop <id>               # detener\ndocker rm <id>                 # eliminar\n\`\`\`\n\n## Cheat sheet de flags\n\n| Flag | Significado |\n|------|-------------|\n| \`-d\` | Detached (background) |\n| \`-p\` | Port mapping host:container |\n| \`-v\` | Volume mount |\n| \`--name\` | Nombre personalizado |\n`,
              },
            ],
          },
          {
            id: 'la-1-2',
            title: 'Docker Compose y multi-contenedores',
            duration: 40,
            order: 2,
            isFree: false,
            contentBlocks: [
              {
                id: 'cba-3',
                type: EContentType.VIDEO,
                title: 'Docker Compose en la práctica',
                duration: 25,
                order: 1,
                isRequired: true,
                description: 'Orquesta múltiples servicios con docker-compose.yml: base de datos, backend y frontend juntos.',
                url: 'https://www.youtube.com/watch?v=SXwC9fSwct8',
                videoProvider: 'youtube',
              },
              {
                id: 'cba-4',
                type: EContentType.QUIZ,
                title: 'Quiz: Docker fundamentals',
                duration: 15,
                order: 2,
                isRequired: true,
                timeLimit: 8,
                passingScore: 70,
                maxAttempts: 3,
                questions: [
                  {
                    id: 'qa-1', type: 'multiple-choice', question: '¿Qué hace el flag -p 8080:80 en docker run?', points: 1, order: 1,
                    options: [{ id: 'a', text: 'Expone el puerto 8080 del contenedor al 80 del host' }, { id: 'b', text: 'Mapea el puerto 8080 del host al 80 del contenedor' }, { id: 'c', text: 'Crea una red en el puerto 8080' }, { id: 'd', text: 'Ninguna de las anteriores' }],
                    correctAnswers: ['b'], explanation: 'host:container — el tráfico al puerto 8080 del host llega al 80 del contenedor.',
                  },
                  {
                    id: 'qa-2', type: 'true-false', question: 'Un Dockerfile es un archivo de texto con instrucciones para construir una imagen Docker.', points: 1, order: 2,
                    correctAnswer: true, explanation: 'Correcto. FROM, RUN, COPY, CMD son instrucciones comunes.',
                  },
                  {
                    id: 'qa-3', type: 'multiple-choice', question: '¿Cuál es el comando correcto para listar todos los contenedores (activos e inactivos)?', points: 1, order: 3,
                    options: [{ id: 'a', text: 'docker ps' }, { id: 'b', text: 'docker containers list' }, { id: 'c', text: 'docker ps -a' }, { id: 'd', text: 'docker list all' }],
                    correctAnswers: ['c'], explanation: 'El flag -a (o --all) permite ver todos los contenedores, incluso los detenidos.',
                  },
                  {
                    id: 'qa-4', type: 'true-false', question: 'Docker Compose se utiliza para definir y ejecutar aplicaciones multi-contenedor en Docker.', points: 1, order: 4,
                    correctAnswer: true, explanation: 'Correcto. Con docker-compose.yml puedes orquestar múltiples servicios fácilmente.',
                  },
                  {
                    id: 'qa-5', type: 'multiple-choice', question: '¿Para qué sirve la instrucción WORKDIR en un Dockerfile?', points: 1, order: 5,
                    options: [{ id: 'a', text: 'Para descargar dependencias' }, { id: 'b', text: 'Para establecer el directorio de trabajo donde se ejecutarán las siguientes instrucciones' }, { id: 'c', text: 'Para definir el punto de entrada de la aplicación' }, { id: 'd', text: 'Ninguna de las anteriores' }],
                    correctAnswers: ['b'], explanation: 'Establece el directorio base para cualquier comando RUN, CMD, ENTRYPOINT, COPY o ADD.',
                  },
                  {
                    id: 'qa-6', type: 'true-false', question: 'Las imágenes de Docker son mutables y se pueden modificar una vez creadas.', points: 1, order: 6,
                    correctAnswer: false, explanation: 'Falso. Las imágenes de Docker son de solo lectura (inmutables). Se instancian en contenedores que tienen una capa de escritura temporal.',
                  },
                  {
                    id: 'qa-7', type: 'multiple-choice', question: '¿Qué comando descarga una imagen de un registro como Docker Hub sin ejecutarla?', points: 1, order: 7,
                    options: [{ id: 'a', text: 'docker get' }, { id: 'b', text: 'docker fetch' }, { id: 'c', text: 'docker pull' }, { id: 'd', text: 'docker load' }],
                    correctAnswers: ['c'], explanation: 'docker pull descarga la imagen a la máquina host.',
                  },
                  {
                    id: 'qa-8', type: 'multiple-choice', question: 'En un docker-compose.yml, ¿qué etiqueta define las dependencias entre servicios?', points: 1, order: 8,
                    options: [{ id: 'a', text: 'requires:' }, { id: 'b', text: 'depends_on:' }, { id: 'c', text: 'links:' }, { id: 'd', text: 'needs:' }],
                    correctAnswers: ['b'], explanation: 'depends_on expresa el orden de inicio (y apagado) de los servicios.',
                  },
                  {
                    id: 'qa-9', type: 'true-false', question: 'El comando `docker rm` elimina una imagen del disco duro.', points: 1, order: 9,
                    correctAnswer: false, explanation: 'Falso. `docker rm` elimina contenedores. Para eliminar imágenes se usa `docker rmi`.',
                  },
                  {
                    id: 'qa-10', type: 'multiple-choice', question: '¿Cuál es la principal diferencia entre CMD y ENTRYPOINT?', points: 1, order: 10,
                    options: [{ id: 'a', text: 'Ninguna, hacen exactamente lo mismo' }, { id: 'b', text: 'ENTRYPOINT no puede ser sobreescrito fácilmente, CMD sí' }, { id: 'c', text: 'CMD se ejecuta en tiempo de build, ENTRYPOINT en tiempo de run' }, { id: 'd', text: 'ENTRYPOINT solo funciona con imágenes Alpine' }],
                    correctAnswers: ['b'], explanation: 'CMD define parámetros por defecto que son fácilmente reemplazables, ENTRYPOINT configura el ejecutable principal.',
                  },
                  {
                    id: 'qa-11', type: 'multiple-choice', question: '¿Cómo puedes pasar una variable de entorno a un contenedor al iniciarlo?', points: 1, order: 11,
                    options: [{ id: 'a', text: 'Usando el flag -e o --env' }, { id: 'b', text: 'Usando el flag -v' }, { id: 'c', text: 'Mediante docker set-env' }, { id: 'd', text: 'Usando el flag --var' }],
                    correctAnswers: ['a'], explanation: 'El flag -e o --env permite inyectar variables de entorno en tiempo de ejecución.',
                  },
                  {
                    id: 'qa-12', type: 'true-false', question: 'Es una buena práctica ejecutar múltiples aplicaciones (ej. base de datos y backend web) dentro del mismo contenedor Docker.', points: 1, order: 12,
                    correctAnswer: false, explanation: 'Falso. La convención de Docker es "un proceso/servicio por contenedor" para mayor modularidad.',
                  },
                  {
                    id: 'qa-13', type: 'multiple-choice', question: '¿Qué comando permite ver los logs generados por un contenedor en ejecución?', points: 1, order: 13,
                    options: [{ id: 'a', text: 'docker view' }, { id: 'b', text: 'docker inspect' }, { id: 'c', text: 'docker logs' }, { id: 'd', text: 'docker monitor' }],
                    correctAnswers: ['c'], explanation: '`docker logs <id_contenedor>` muestra la salida estándar y de error del contenedor.',
                  },
                  {
                    id: 'qa-14', type: 'true-false', question: 'Los volúmenes de Docker (volumes) permiten persistir datos incluso si el contenedor es destruido.', points: 1, order: 14,
                    correctAnswer: true, explanation: 'Correcto. Los volúmenes almacenan datos fuera del ciclo de vida del contenedor.',
                  },
                  {
                    id: 'qa-15', type: 'multiple-choice', question: '¿Qué instrucción del Dockerfile se usa para copiar archivos desde el host al contenedor?', points: 1, order: 15,
                    options: [{ id: 'a', text: 'TRANSFER' }, { id: 'b', text: 'COPY' }, { id: 'c', text: 'MOVE' }, { id: 'd', text: 'CLONE' }],
                    correctAnswers: ['b'], explanation: 'COPY y ADD son las instrucciones utilizadas para copiar archivos. COPY es preferida para tareas sencillas.',
                  }
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'ma-2',
        title: 'Producción y buenas prácticas',
        order: 2,
        lessons: [
          {
            id: 'la-2-1',
            title: 'Optimización de imágenes y seguridad',
            duration: 40,
            order: 1,
            isFree: false,
            contentBlocks: [
              {
                id: 'cba-5',
                type: EContentType.VIDEO,
                title: 'Multi-stage builds y reducción de tamaño',
                duration: 25,
                order: 1,
                isRequired: true,
                description: 'Técnicas avanzadas para imágenes más pequeñas y seguras.',
                url: 'https://www.youtube.com/watch?v=yyRoFsRMGpQ',
                videoProvider: 'youtube',
              },
              {
                id: 'cba-6',
                type: EContentType.ASSIGNMENT,
                title: 'Proyecto final: Conteneriza tu aplicación',
                duration: 15,
                order: 2,
                isRequired: true,
                maxScore: 100,
                assignmentInstructions: `## Proyecto final\n\nConteneriza una aplicación web completa con Docker Compose.\n\n### Requisitos\n\n1. Crea un \`Dockerfile\` para el backend (Node.js o Python)\n2. Crea un \`docker-compose.yml\` que incluya:\n   - Backend\n   - Base de datos (PostgreSQL o MongoDB)\n   - (Opcional) Frontend\n3. La app debe arrancar con \`docker compose up\`\n\n### Entregable\n\nSube el enlace a tu repositorio de GitHub con:\n- \`Dockerfile\`\n- \`docker-compose.yml\`\n- \`README.md\` con instrucciones de ejecución\n\n### Criterios\n\n| Criterio | Puntos |\n|----------|--------|\n| Dockerfile funcional | 40 |\n| docker-compose.yml correcto | 40 |\n| README claro | 20 |\n`,
              },
            ],
          },
        ],
      },
    ],
  },

  // ── Curso completado (demo certificado) ──────────────────────────────────────
  {
    id: 'c-done',
    title: 'Git y GitHub para Desarrolladores',
    description: 'Domina el control de versiones con Git: ramas, merges, resolución de conflictos, pull requests y flujos de trabajo colaborativos con GitHub.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=600&q=80',
    status: ECourseStatus.PUBLISHED,
    difficulty: EDifficulty.BEGINNER,
    tags: ['Git', 'GitHub', 'DevOps'],
    institutionId: '1',
    instructorName: 'Sebastián Molina',
    enrolledCount: 8420,
    completionRate: 91,
    totalDuration: 165,
    totalLessons: 5,
    averageRating: 4.8,
    ratingCount: 1980,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-09-10'),
    publishedAt: new Date('2024-03-15'),
    modules: [
      {
        id: 'md-1',
        title: 'Fundamentos de Git',
        order: 1,
        lessons: [
          {
            id: 'ld-1-1',
            title: 'Introducción al control de versiones',
            duration: 35,
            order: 1,
            isFree: true,
            contentBlocks: [
              {
                id: 'cbd-1',
                type: EContentType.VIDEO,
                title: '¿Qué es Git y por qué usarlo?',
                duration: 20,
                order: 1,
                isRequired: true,
                description: 'Historia del control de versiones y por qué Git se convirtió en el estándar.',
                url: 'https://www.youtube.com/watch?v=hwP7WQkmECE',
                videoProvider: 'youtube',
              },
              {
                id: 'cbd-2',
                type: EContentType.DOCUMENT,
                title: 'Comandos esenciales de Git',
                duration: 15,
                order: 2,
                isRequired: true,
                markdownContent: `# Comandos esenciales de Git\n\nEsta guía cubre los comandos más usados en el día a día.\n\n## Configuración inicial\n\n\`\`\`bash\ngit config --global user.name "Tu Nombre"\ngit config --global user.email "tu@email.com"\n\`\`\`\n\n## Flujo básico\n\n| Comando | Descripción |\n|---------|-------------|\n| \`git init\` | Inicializar repositorio |\n| \`git add .\` | Agregar al staging |\n| \`git commit -m "msg"\` | Crear commit |\n| \`git push\` | Subir cambios |\n\n## Estados de un archivo\n\n1. **Untracked** — archivo nuevo sin seguimiento\n2. **Staged** — listo para commit\n3. **Committed** — guardado en el historial\n`,
              },
            ],
          },
          {
            id: 'ld-1-2',
            title: 'Ramas y trabajo en equipo',
            duration: 40,
            order: 2,
            isFree: false,
            contentBlocks: [
              {
                id: 'cbd-3',
                type: EContentType.VIDEO,
                title: 'Branching y Merging',
                duration: 25,
                order: 1,
                isRequired: true,
                description: 'Aprende a crear ramas, hacer merges y resolver conflictos de forma efectiva.',
                url: 'https://www.youtube.com/watch?v=e2IbNHi4uCI',
                videoProvider: 'youtube',
              },
              {
                id: 'cbd-4',
                type: EContentType.QUIZ,
                title: 'Quiz: Fundamentos de Git',
                duration: 15,
                order: 2,
                isRequired: true,
                timeLimit: 10,
                passingScore: 70,
                questions: [
                  {
                    id: 'qd-1', type: 'multiple-choice', question: '¿Qué comando crea una nueva rama y cambia a ella?', points: 1, order: 1,
                    options: [{ id: 'a', text: 'git branch nueva' }, { id: 'b', text: 'git checkout -b nueva' }, { id: 'c', text: 'git switch nueva' }, { id: 'd', text: 'git new nueva' }],
                    correctAnswers: ['b'], explanation: 'git checkout -b crea la rama y hace switch inmediatamente.',
                  },
                  {
                    id: 'qd-2', type: 'true-false', question: 'git merge integra los cambios de una rama en la rama actual.', points: 1, order: 2,
                    correctAnswer: true, explanation: 'Correcto. git merge une el historial de la rama indicada.',
                  },
                  {
                    id: 'qd-3', type: 'multiple-choice', question: '¿Cuál es el propósito de git stash?', points: 1, order: 3,
                    options: [{ id: 'a', text: 'Eliminar cambios del directorio de trabajo' }, { id: 'b', text: 'Guardar cambios temporalmente sin hacer commit' }, { id: 'c', text: 'Subir cambios al repositorio remoto' }, { id: 'd', text: 'Ver el historial de commits' }],
                    correctAnswers: ['b'], explanation: 'git stash guarda el trabajo en progreso para recuperarlo después.',
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'md-2',
        title: 'GitHub y colaboración',
        order: 2,
        lessons: [
          {
            id: 'ld-2-1',
            title: 'Pull Requests y Code Review',
            duration: 45,
            order: 1,
            isFree: false,
            contentBlocks: [
              {
                id: 'cbd-5',
                type: EContentType.VIDEO,
                title: 'Flujo de trabajo con Pull Requests',
                duration: 25,
                order: 1,
                isRequired: true,
                description: 'Aprende el flujo completo: fork, branch, PR, review y merge en GitHub.',
                url: 'https://www.youtube.com/watch?v=rgbCcBNZcdQ',
                videoProvider: 'youtube',
              },
              {
                id: 'cbd-6',
                type: EContentType.ASSIGNMENT,
                title: 'Proyecto: Contribución a repositorio compartido',
                duration: 20,
                order: 2,
                isRequired: true,
                maxScore: 100,
                assignmentInstructions: `## Objetivo\n\nContribuye al repositorio de práctica del curso abriendo un Pull Request real.\n\n### Pasos\n\n1. Haz **fork** del repositorio \`gems-git-practice\`\n2. Crea una rama con tu nombre: \`feature/tu-nombre\`\n3. Agrega un archivo \`tu-nombre.md\` con:\n   - Tu nombre\n   - Lo que aprendiste en el curso\n   - Un comando de Git favorito y por qué\n4. Abre un **Pull Request** con descripción clara\n\n### Criterios de evaluación\n\n| Criterio | Puntos |\n|----------|--------|\n| PR abierto correctamente | 40 |\n| Descripción del PR completa | 30 |\n| Archivo markdown bien formateado | 30 |\n`,
              },
            ],
          },
          {
            id: 'ld-2-2',
            title: 'GitHub Actions y CI/CD básico',
            duration: 45,
            order: 2,
            isFree: false,
            contentBlocks: [
              {
                id: 'cbd-7',
                type: EContentType.VIDEO,
                title: 'Introducción a GitHub Actions',
                duration: 30,
                order: 1,
                isRequired: true,
                description: 'Automatiza tus flujos de trabajo con GitHub Actions: tests, linting y deploys automáticos.',
                url: 'https://www.youtube.com/watch?v=R8_veQiYBjI',
                videoProvider: 'youtube',
              },
              {
                id: 'cbd-8',
                type: EContentType.DOCUMENT,
                title: 'Recursos adicionales y próximos pasos',
                duration: 15,
                order: 2,
                isRequired: true,
                markdownContent: `# ¡Felicitaciones por completar el curso!\n\n## Qué aprendiste\n\n- ✅ Control de versiones con Git\n- ✅ Ramas, merges y resolución de conflictos\n- ✅ Colaboración con GitHub y Pull Requests\n- ✅ Automatización con GitHub Actions\n\n## Próximos pasos recomendados\n\n1. **Git avanzado** — rebase interactivo, cherry-pick, bisect\n2. **GitHub Actions avanzado** — matrices, entornos, secretos\n3. **GitOps** — ArgoCD, Flux para despliegues\n\n## Recursos\n\n- [Pro Git Book](https://git-scm.com/book/es/v2) — gratuito y completo\n- [GitHub Skills](https://skills.github.com/) — cursos interactivos oficiales\n- [Conventional Commits](https://www.conventionalcommits.org/) — estándar para mensajes de commit\n`,
              },
            ],
          },
        ],
      },
    ],
  }
];

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class CourseService {
  private readonly USE_MOCK = true;

  private calculateDurations(course: ICourse): ICourse {
    if (!course) return course;
    let totalCourseDuration = 0;
    if (course.modules) {
      course.modules.forEach(mod => {
        if (mod.lessons) {
          mod.lessons.forEach(les => {
            const sum = les.contentBlocks?.reduce((acc, block) => acc + (block.duration ?? 0), 0) ?? 0;
            les.duration = sum;
            totalCourseDuration += sum;
          });
        }
      });
    }
    course.totalDuration = totalCourseDuration;
    return course;
  }

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
      const courses = filtered.slice((page - 1) * limit, page * limit).map(c => this.calculateDurations(c));
      return of({ courses, total, page, limit }).pipe(delay(400));
    }
    return of({ courses: [], total: 0, page, limit });
  }

  getCourseById(id: string): Observable<ICourse> {
    if (this.USE_MOCK) {
      const found = MOCK_COURSES.find(c => c.id === id);
      return of(found ? this.calculateDurations(found) : null!).pipe(delay(200));
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
