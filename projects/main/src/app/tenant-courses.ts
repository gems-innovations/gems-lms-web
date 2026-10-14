import type { IPublicCourse } from './public/public-catalog.service';

export function escapeHtml(value: string | null | undefined): string {
  return (value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
}

/** Solo https o rutas propias; cualquier otra cosa se descarta. */
function safeUrl(url: string | null | undefined): string {
  const value = (url ?? '').trim();
  return /^(https:\/\/|\/(?!\/))/i.test(value) ? escapeHtml(value) : '';
}

/**
 * Tarjetas de los cursos publicados de la institución, como HTML con clases estables que ella puede
 * estilizar: .gems-cursos, .gems-curso, .gems-curso__img, .gems-curso__title, .gems-curso__desc, .gems-curso__meta.
 * Cada tarjeta lleva a iniciar sesión: los cursos de una institución son para sus integrantes.
 */
export function coursesHtml(courses: readonly IPublicCourse[]): string {
  if (!courses.length) return '<p class="gems-cursos__empty">Pronto publicaremos los cursos.</p>';
  const cards = courses.map(course => {
    const image = safeUrl(course.thumbnailUrl);
    const meta = [course.instructorName, course.modules ? `${course.modules} módulos` : '']
      .filter(Boolean).map(escapeHtml).join(' · ');
    return `<a class="gems-curso" href="/auth/signin">`
      + (image ? `<img class="gems-curso__img" src="${image}" alt="" loading="lazy">` : '<span class="gems-curso__img gems-curso__img--empty"></span>')
      + `<span class="gems-curso__body"><strong class="gems-curso__title">${escapeHtml(course.title)}</strong>`
      + `<span class="gems-curso__desc">${escapeHtml((course.description ?? '').slice(0, 160))}</span>`
      + (meta ? `<span class="gems-curso__meta">${meta}</span>` : '')
      + `</span></a>`;
  });
  return `<div class="gems-cursos">${cards.join('')}</div>`;
}

export interface ITenantContext { name: string; logoUrl: string | null | undefined; courses: readonly IPublicCourse[] }

/** Reemplaza los marcadores del HTML de la institución: {{cursos}}, {{nombre}}, {{logo}} e {{ingresar}}. */
export function fillPlaceholders(html: string, context: ITenantContext): string {
  return html
    .split('{{cursos}}').join(coursesHtml(context.courses))
    .split('{{nombre}}').join(escapeHtml(context.name))
    .split('{{logo}}').join(safeUrl(context.logoUrl))
    .split('{{ingresar}}').join('/auth/signin');
}
