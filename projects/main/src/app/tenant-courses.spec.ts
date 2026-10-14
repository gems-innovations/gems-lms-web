import { coursesHtml, escapeHtml, fillPlaceholders } from './tenant-courses';
import type { IPublicCourse } from './public/public-catalog.service';

const course = (over: Partial<IPublicCourse>): IPublicCourse => ({
  id: 1, title: 'Cálculo', description: 'Límites', thumbnailUrl: null, difficulty: null, tags: null,
  instructorName: 'Ana', modules: 3, lessons: 9, durationMinutes: null, enrolled: null, outline: [], ...over,
});

describe('tenant courses', () => {
  it('escapes everything that comes from a course', () => {
    const html = coursesHtml([course({ title: '<img onerror=x>', description: '"><script>' })]);
    expect(html).not.toContain('<img onerror');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;img onerror=x&gt;');
  });

  it('only keeps https or own-path thumbnails', () => {
    expect(coursesHtml([course({ thumbnailUrl: 'javascript:alert(1)' })])).toContain('gems-curso__img--empty');
    expect(coursesHtml([course({ thumbnailUrl: 'https://cdn.test/a.png' })])).toContain('src="https://cdn.test/a.png"');
  });

  it('says so when there are no courses', () => {
    expect(coursesHtml([])).toContain('gems-cursos__empty');
  });

  it('fills the placeholders', () => {
    const html = fillPlaceholders('<h1>{{nombre}}</h1><img src="{{logo}}">{{cursos}}<a href="{{ingresar}}">x</a>',
      { name: 'U & Co', logoUrl: 'https://cdn.test/l.png', courses: [] });
    expect(html).toContain('<h1>U &amp; Co</h1>');
    expect(html).toContain('src="https://cdn.test/l.png"');
    expect(html).toContain('href="/auth/signin"');
    expect(html).toContain('gems-cursos__empty');
  });

  it('escapeHtml handles null', () => {
    expect(escapeHtml(null)).toBe('');
  });
});
