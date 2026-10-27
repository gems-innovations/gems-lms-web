import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from 'shared';
import { CourseService, ICourseApi } from './course.service';

describe('CourseService · editar y eliminar del currículo', () => {
  let service: CourseService;
  let http: HttpTestingController;
  const url = environment.apiUrls.education.courses;

  const lesson = (id: number, moduleId: number, order: number) =>
    ({ id, moduleId, title: `L${id}`, orderIndex: order, contents: [], description: null, isFree: false });
  const api: ICourseApi = {
    id: 7, title: 'Curso', description: null, status: 'DRAFT', difficulty: 'BEGINNER', tags: [], thumbnailUrl: null,
    instructorName: null, institutionId: 'i', totalDuration: 0, totalLessons: 3, enrolledCount: 0, completionRate: 0,
    averageRating: 0, ratingCount: 0, publishedAt: null, createdAt: '2026-01-01', updatedAt: '2026-01-01',
    modules: [
      { id: 1, courseId: 7, title: 'M1', orderIndex: 1, description: null, lessons: [lesson(10, 1, 1), lesson(11, 1, 2)] },
      { id: 2, courseId: 7, title: 'M2', orderIndex: 2, description: null, lessons: [lesson(12, 2, 1)] },
    ],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CourseService);
    http = TestBed.inject(HttpTestingController);
    // Carga el curso una vez para que el servicio conozca de qué curso es cada módulo y lección.
    service.getCourseById('7').subscribe();
    http.expectOne(`${url}/7`).flush(api);
  });

  afterEach(() => http.verify());

  function guardado(op: () => void) {
    op();
    http.expectOne(`${url}/7`).flush(api); // lectura del árbol vigente
    const put = http.expectOne(r => r.method === 'PUT' && r.url === `${url}/7`);
    put.flush(api);
    return put.request.body.modules as { title: string; orderIndex: number; lessons: { title: string; orderIndex: number }[] }[];
  }

  it('elimina una lección y renumera las que quedan', () => {
    const modules = guardado(() => service.deleteLesson('10').subscribe());
    expect(modules[0].lessons.map(l => l.title)).toEqual(['L11']);
    expect(modules[0].lessons[0].orderIndex).toBe(1);
    expect(modules[1].lessons.length).toBe(1);
  });

  it('elimina un módulo con sus lecciones y renumera', () => {
    const modules = guardado(() => service.deleteModule('1').subscribe());
    expect(modules.map(m => m.title)).toEqual(['M2']);
    expect(modules[0].orderIndex).toBe(1);
  });

  it('cambia el título de un módulo sin tocar lo demás', () => {
    const modules = guardado(() => service.updateModule('2', { title: 'Nuevo' }).subscribe());
    expect(modules.map(m => m.title)).toEqual(['M1', 'Nuevo']);
    expect(modules[0].lessons.length).toBe(2);
  });
});
