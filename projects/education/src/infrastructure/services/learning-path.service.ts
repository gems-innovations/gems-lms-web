import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import {
  ILearningPath,
  ILearningPathStep,
  ICreateLearningPathRequest,
  IUpdateLearningPathRequest,
  ILearningPathListResponse,
  ELearningPathStatus
} from '../../domain/model/learning-path.model';

const MOCK_PATHS: ILearningPath[] = [
  {
    id: 'lp1',
    title: 'Data Science Professional Path',
    description: 'Ruta completa para convertirte en Data Scientist: desde Python hasta Machine Learning avanzado y despliegue de modelos en producción.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80',
    status: ELearningPathStatus.PUBLISHED,
    tags: ['Data Science', 'Python', 'AI', 'ML'],
    institutionId: '1',
    enrolledCount: 1240,
    completionRate: 61,
    estimatedDuration: 3360, // 56h
    averageRating: 4.8,
    ratingCount: 2156,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-10-10'),
    steps: [
      {
        id: 'lps1', courseId: 'c3', courseTitle: 'Análisis de Datos con Python',
        courseThumbnailUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=200&q=60',
        order: 1, isRequired: true, estimatedDuration: 960,
        moduleCount: 4, lessonCount: 11
      },
      {
        id: 'lps2', courseId: 'c1', courseTitle: 'Introducción a la Inteligencia Artificial',
        courseThumbnailUrl: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=200&q=60',
        order: 2, isRequired: true, minimumScore: 70, estimatedDuration: 780,
        moduleCount: 5, lessonCount: 24
      },
      {
        id: 'lps5', courseId: 'c5', courseTitle: 'Machine Learning Avanzado con TensorFlow',
        courseThumbnailUrl: 'https://images.unsplash.com/photo-1555255707-c07966088b7b?w=200&q=60',
        order: 3, isRequired: true, minimumScore: 75, estimatedDuration: 1080,
        moduleCount: 6, lessonCount: 32
      },
      {
        id: 'lps6', courseId: 'c6', courseTitle: 'Despliegue de Modelos en Producción',
        courseThumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=200&q=60',
        order: 4, isRequired: false, estimatedDuration: 540,
        moduleCount: 3, lessonCount: 15
      }
    ]
  },
  {
    id: 'lp2',
    title: 'Web Developer Bootcamp',
    description: 'De cero a Full Stack Developer en un programa intensivo. Aprende frontend con Angular, backend con Node.js y cloud.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&q=80',
    status: ELearningPathStatus.PUBLISHED,
    tags: ['Web Dev', 'Angular', 'Node.js', 'Full Stack'],
    institutionId: '1',
    enrolledCount: 890,
    completionRate: 45,
    estimatedDuration: 1320,
    createdAt: new Date('2024-04-01'),
    updatedAt: new Date('2024-10-05'),
    steps: [
      {
        id: 'lps3', courseId: 'c2', courseTitle: 'Desarrollo Full Stack con Angular y Node.js',
        courseThumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=200&q=60',
        order: 1, isRequired: true, estimatedDuration: 1320
      }
    ]
  },
  {
    id: 'lp3',
    title: 'Especialización en Marketing Digital',
    description: 'Conviértete en un experto en marketing online. Desde estrategia de contenido hasta campañas de pago y analítica avanzada.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=600&q=80',
    status: ELearningPathStatus.PUBLISHED,
    tags: ['Marketing', 'SEO', 'Digital'],
    institutionId: '3',
    enrolledCount: 0,
    completionRate: 0,
    estimatedDuration: 600,
    createdAt: new Date('2024-10-15'),
    updatedAt: new Date('2024-10-25'),
    steps: [
      {
        id: 'lps4', courseId: 'c4', courseTitle: 'Marketing Digital y Estrategia de Contenido',
        order: 1, isRequired: true, estimatedDuration: 600
      }
    ]
  }
  ,
  {
    id: 'lp4',
    title: 'Diseño UX/UI Profesional',
    description: 'Desde investigación de usuarios hasta sistemas de diseño y handoff. Aprende Figma, prototipado y pruebas de usabilidad.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&q=80',
    status: ELearningPathStatus.PUBLISHED,
    tags: ['UX', 'UI', 'Figma', 'Diseño'],
    institutionId: '3',
    enrolledCount: 1560,
    completionRate: 70,
    estimatedDuration: 1440,
    averageRating: 4.8,
    ratingCount: 890,
    createdAt: new Date('2024-04-10'),
    updatedAt: new Date('2024-11-01'),
    steps: [
      { id: 'lps7', courseId: 'c9', courseTitle: 'UX/UI Design: Figma a Producto Real', order: 1, isRequired: true, estimatedDuration: 720 }
    ]
  },
  {
    id: 'lp5',
    title: 'Cloud & DevOps Engineering',
    description: 'Domina AWS, Docker, Kubernetes, Terraform y CI/CD para convertirte en un ingeniero de infraestructura cloud moderno.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600&q=80',
    status: ELearningPathStatus.PUBLISHED,
    tags: ['AWS', 'DevOps', 'Docker', 'Kubernetes'],
    institutionId: '2',
    enrolledCount: 2100,
    completionRate: 52,
    estimatedDuration: 1740,
    averageRating: 4.7,
    ratingCount: 1340,
    createdAt: new Date('2024-05-01'),
    updatedAt: new Date('2024-11-15'),
    steps: [
      { id: 'lps8', courseId: 'c8', courseTitle: 'AWS Cloud Practitioner + Solutions Architect', order: 1, isRequired: true, estimatedDuration: 1200 },
      { id: 'lps9', courseId: 'c6', courseTitle: 'Despliegue de Modelos en Producción', order: 2, isRequired: false, estimatedDuration: 540 }
    ]
  }
];

@Injectable({ providedIn: 'root' })
export class LearningPathService {
  private readonly USE_MOCK = true;

  getLearningPaths(page = 1, limit = 12): Observable<ILearningPathListResponse> {
    if (this.USE_MOCK) {
      const total = MOCK_PATHS.length;
      const learningPaths = MOCK_PATHS.slice((page - 1) * limit, page * limit);
      return of({ learningPaths, total, page, limit }).pipe(delay(350));
    }
    return of({ learningPaths: [], total: 0, page, limit });
  }

  getLearningPathById(id: string): Observable<ILearningPath> {
    if (this.USE_MOCK) {
      return of(MOCK_PATHS.find(lp => lp.id === id)!).pipe(delay(200));
    }
    return of(MOCK_PATHS[0]);
  }

  createLearningPath(req: ICreateLearningPathRequest): Observable<ILearningPath> {
    if (this.USE_MOCK) {
      const lp: ILearningPath = {
        id: `lp${Date.now()}`,
        title: req.title,
        description: req.description,
        thumbnailUrl: req.thumbnailUrl,
        status: ELearningPathStatus.DRAFT,
        tags: req.tags,
        institutionId: '1',
        steps: [],
        estimatedDuration: 0,
        enrolledCount: 0,
        completionRate: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      MOCK_PATHS.unshift(lp);
      return of(lp).pipe(delay(400));
    }
    return of(MOCK_PATHS[0]);
  }

  updateLearningPath(id: string, req: IUpdateLearningPathRequest): Observable<ILearningPath> {
    if (this.USE_MOCK) {
      const idx = MOCK_PATHS.findIndex(lp => lp.id === id);
      if (idx !== -1) {
        const updated: ILearningPath = {
          ...MOCK_PATHS[idx],
          ...req,
          estimatedDuration: req.steps
            ? req.steps.reduce((s, st) => s + st.estimatedDuration, 0)
            : MOCK_PATHS[idx].estimatedDuration,
          updatedAt: new Date()
        };
        MOCK_PATHS[idx] = updated;
        return of(updated).pipe(delay(400));
      }
    }
    return of(MOCK_PATHS[0]);
  }

  deleteLearningPath(id: string): Observable<void> {
    if (this.USE_MOCK) {
      const idx = MOCK_PATHS.findIndex(lp => lp.id === id);
      if (idx !== -1) MOCK_PATHS.splice(idx, 1);
      return of(void 0).pipe(delay(300));
    }
    return of(void 0);
  }
}
