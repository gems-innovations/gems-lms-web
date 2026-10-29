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

  it('reemplaza el contenido de un bloque conservando su id y su lugar', () => {
    const conBloque = { ...api, modules: [{ ...api.modules![0], lessons: [{ ...lesson(10, 1, 1), contents: [{ id: 90, lessonId: 10, type: 'cards', orderIndex: 1, value: JSON.stringify({ title: 'Viejo', duration: 3, isRequired: true, cards: [] }) }] }] }] };
    service.replaceBlock({ lessonId: '10', type: 'cards' as never, title: 'Nuevo', duration: 5 }, '90').subscribe();
    http.expectOne(`${url}/7`).flush(conBloque);
    const put = http.expectOne(r => r.method === 'PUT' && r.url === `${url}/7`);
    put.flush(conBloque);
    const c = put.request.body.modules[0].lessons[0].contents;
    expect(c.length).toBe(1);
    expect(c[0].id).toBe(90);
    expect(JSON.parse(c[0].value).title).toBe('Nuevo');
  });

  it('crea un curso desde una plantilla con sus módulos y tareas', () => {
    service.createCourse({ title: 'Mi curso', description: 'd', difficulty: 'beginner' as never, tags: [], institutionId: 'i', templateId: 'emprender-canvas' }).subscribe();
    http.expectOne(r => r.method === 'POST' && r.url === url).flush({ ...api, modules: [] });
    const put = http.expectOne(r => r.method === 'PUT' && r.url === `${url}/7`);
    put.flush(api);
    const modules = put.request.body.modules;
    expect(modules.length).toBe(3);
    const tipos = modules.flatMap((m: any) => m.lessons.flatMap((l: any) => l.contents.map((c: any) => c.type)));
    expect(tipos).toContain('assignment');
    expect(tipos).toContain('live-session');
  });
});
