import { auditCourseAccessibility } from './content-accessibility';
import { EContentType } from '../domain/model/course.model';
import type { ICourse } from '../domain/model/course.model';

function course(blocks: any[]): ICourse {
  return { modules: [{ id: 'm', title: 'Unidad 1', order: 1, lessons: [{ id: 'l', title: 'Semana 1', order: 1, duration: 0, isFree: false,
    contentBlocks: blocks.map((b, i) => ({ id: String(i), order: i, isRequired: true, ...b })) }] }] } as unknown as ICourse;
}

describe('auditCourseAccessibility', () => {
  it('flags images without description, generic links, skipped headings and videos without captions', () => {
    const r = auditCourseAccessibility(course([
      { type: EContentType.DOCUMENT, title: 'Lectura', markdownContent: '# Tema\n### Detalle\n![](a.png) ![foto1.jpg](b.png) [aquí](http://x)' },
      { type: EContentType.VIDEO, title: 'Clase', url: 'https://api/files/public/abc', videoProvider: 'upload' },
      { type: EContentType.VIDEO, title: 'Charla', url: 'https://youtube.com/watch?v=1' },
    ]));
    const messages = r.issues.map(i => i.message);
    expect(messages).toContain('2 imagen(es) sin descripción');
    expect(messages.some(m => m.includes('texto genérico'))).toBeTrue();
    expect(messages.some(m => m.includes('saltan niveles'))).toBeTrue();
    expect(messages).toContain('Video sin subtítulos ni transcripción');
    expect(messages).toContain('Video sin transcripción');
    expect(r.issues[0].severity).toBe('error');
    expect(r.score).toBe(0);
  });

  it('gives full marks to described, captioned content', () => {
    const r = auditCourseAccessibility(course([
      { type: EContentType.DOCUMENT, title: 'Lectura', markdownContent: '# Tema\n## Parte\n![Mapa de Colombia](m.png) [Guía de Python](http://x)' },
      { type: EContentType.VIDEO, title: 'Clase', url: 'https://api/files/public/abc', videoProvider: 'upload', captionsUrl: 'https://api/files/public/sub' },
    ]));
    expect(r.issues).toEqual([]);
    expect(r.score).toBe(100);
  });
});
