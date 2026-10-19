import { expect, Page, Request, Route, test } from '@playwright/test';

/**
 * Soporte de la suite de humo (e2e/humo-*.spec.ts): una API falsa en el navegador y sesiones de prueba.
 *
 * La suite no necesita backend ni cuentas: cada llamada a `/api/v1/...` (en cualquier host) se responde aquí con datos
 * mínimos y nunca sale a la red. Así corre igual en un PC, en CI y contra un build estático. Los tokens son de mentira
 * (JWT sin firma); el front solo lee `exp` e `institutionId` y el API real nunca los ve.
 */

export type Rol = 'student' | 'instructor' | 'admin' | 'super_admin' | 'invitado';

const API = /\/api\/v1\//;
const ROL_API: Record<Rol, string> = {
  student: 'STUDENT', instructor: 'INSTRUCTOR', admin: 'ADMIN', super_admin: 'SUPER_ADMIN', invitado: 'STUDENT',
};

/** Inicio de cada rol (auth/core getRoleHomePath). */
export const INICIO: Record<Rol, RegExp> = {
  student: /\/learn\/home$/,
  invitado: /\/learn\/my-learning$/,
  instructor: /\/instructor(\/courses)?$/,
  admin: /\/admin\/dashboard$/,
  super_admin: /\/admin\/institutions$/,
};

function b64url(o: unknown): string {
  return Buffer.from(JSON.stringify(o)).toString('base64url');
}

/** JWT de mentira: el front solo lee `exp` e `institutionId`. `vencido` lo deja expirado hace una hora. */
export function tokenFalso(institutionId: string | null, vencido = false): string {
  const exp = Math.floor(Date.now() / 1000) + (vencido ? -3600 : 3600);
  return `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({ sub: 'humo', exp, ...(institutionId ? { institutionId } : {}) })}.humo`;
}

/** Usuario como lo devuelve el API (IUserResponse). */
export function usuarioApi(rol: Rol) {
  const invitado = rol === 'invitado';
  return {
    userId: 900 + Object.keys(ROL_API).indexOf(rol),
    firstName: invitado ? 'Invitado' : 'Prueba',
    lastName: invitado ? '' : rol,
    username: `humo-${rol}`,
    email: invitado ? 'humo-1@invitado.gems.lat' : `humo-${rol.replace('_', '-')}@prueba.test`,
    role: ROL_API[rol],
    institutionId: rol === 'super_admin' ? null : 'inst-1',
    avatarUrl: null,
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

/** Sesión guardada en localStorage (`gems_session`), igual a la que deja AuthSessionService. */
function sesionGuardada(rol: Rol, vencida = false): string {
  const u = usuarioApi(rol);
  const user = {
    id: String(u.userId), email: u.email, firstName: u.firstName, lastName: u.lastName, username: u.username,
    role: rol === 'invitado' ? 'student' : rol, institutionId: u.institutionId ?? undefined, isActive: true,
    createdAt: u.createdAt, updatedAt: u.updatedAt,
  };
  return JSON.stringify({ user, token: tokenFalso(u.institutionId, vencida), branding: null, institutionName: 'Institución de prueba' });
}

/** Abre la página ya con sesión del rol (solo en la primera carga de la pestaña: cerrar sesión la borra de verdad). */
export async function conSesion(page: Page, rol: Rol, opciones: { vencida?: boolean } = {}): Promise<void> {
  await page.addInitScript(([valor]) => {
    if (sessionStorage.getItem('humo-sesion')) return;
    localStorage.setItem('gems_session', valor);
    sessionStorage.setItem('humo-sesion', '1');
  }, [sesionGuardada(rol, opciones.vencida)]);
}

export function cursoPublico(id: number, title: string) {
  return {
    id, title,
    description: `Curso de prueba «${title}» para la suite de humo.`,
    thumbnailUrl: null, difficulty: 'beginner', tags: ['humo'], instructorName: 'Equipo GEMS',
    modules: 1, lessons: 2, durationMinutes: 20, enrolled: 10,
    outline: [{ id: id * 10, title: 'Módulo 1', lessons: [
      { id: id * 100 + 1, title: 'Primera lección', blocks: 2, free: true },
      { id: id * 100 + 2, title: 'Segunda lección', blocks: 3, free: true },
    ] }],
  };
}

/** Catálogo de GEMS Abierto (los títulos coinciden con lo que buscan /retos y /bloques para su invitación). */
export const CURSOS = [
  cursoPublico(1, 'Casos y acertijos de lógica'),
  cursoPublico(2, 'Razonamiento cuantitativo'),
  cursoPublico(3, 'Bloques: ¿cuánto sabes?'),
  cursoPublico(4, 'Lectura crítica'),
];

export interface IRespuesta { status?: number; body?: unknown }
/** Respuesta propia para una ruta del API: método y expresión sobre la ruta sin `/api/v1` (p. ej. `/public/courses`). */
export interface IRegla { method?: string; path: RegExp; respond: (req: Request, path: string) => IRespuesta }

export interface IApiFalsa {
  /** Llamadas recibidas, como «MÉTODO /ruta». */
  llamadas: string[];
  /** Cuántas veces se llamó a una ruta que cumple la expresión (con método opcional). */
  veces(path: RegExp, method?: string): number;
}

/** Respuestas por defecto: lo público y la sesión. Lo demás: lista vacía en GET y `{}` en el resto. */
function reglasBase(): IRegla[] {
  return [
    { method: 'GET', path: /^\/public\/courses$/, respond: () => ({ body: CURSOS }) },
    { method: 'GET', path: /^\/public\/courses\/(\d+)$/, respond: (_r, p) => {
      const c = CURSOS.find(x => p.endsWith(`/${x.id}`));
      return c ? { body: c } : { status: 404, body: { message: 'No existe' } };
    } },
    // Ningún host de prueba es una institución, salvo que la prueba lo diga.
    { method: 'GET', path: /^\/public\/home\//, respond: () => ({ status: 404, body: { message: 'Sin institución' } }) },
    { method: 'POST', path: /^\/public\/institution-requests$/, respond: () => ({ status: 201, body: { id: 1 } }) },
    { method: 'POST', path: /^\/auth\/guest$/, respond: () => ({ body: { ...usuarioApi('invitado'), token: tokenFalso('inst-1') } }) },
    { method: 'POST', path: /^\/auth\/login$/, respond: req => {
      const email = String((req.postDataJSON() as { email?: string })?.email ?? '');
      const rol = (Object.keys(ROL_API) as Rol[]).find(r => email === usuarioApi(r).email);
      if (!rol) return { status: 401, body: { message: 'Correo o contraseña incorrectos' } };
      const u = usuarioApi(rol);
      return { body: { ...u, token: tokenFalso(u.institutionId) } };
    } },
    { method: 'POST', path: /^\/auth\/(forgot-password|reset-password|verify-email)$/, respond: () => ({ status: 204 }) },
    { method: 'GET', path: /^\/certificates\/verify\//, respond: () => ({ status: 404, body: { message: 'No existe' } }) },
    { method: 'POST', path: /^\/enrollments/, respond: () => ({ status: 201, body: {} }) },
  ];
}

/**
 * Instala la API falsa en la página. `reglas` va antes que las de base (para cambiar una respuesta).
 * `caida: true` simula el API caído (toda llamada falla por red), para probar que nada queda en blanco.
 */
export async function apiFalsa(page: Page, opciones: { reglas?: IRegla[]; caida?: boolean } = {}): Promise<IApiFalsa> {
  const llamadas: string[] = [];
  const reglas = [...(opciones.reglas ?? []), ...reglasBase()];
  await page.route(API, async (route: Route) => {
    const req = route.request();
    const origin = (await req.headerValue('origin')) ?? '*';
    const cors = {
      'access-control-allow-origin': origin,
      'access-control-allow-headers': (await req.headerValue('access-control-request-headers')) ?? 'authorization, content-type',
      'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const path = new URL(req.url()).pathname.replace(/^.*\/api\/v1/, '');
    llamadas.push(`${req.method()} ${path}`);
    if (opciones.caida) return route.abort('connectionrefused');
    const regla = reglas.find(r => (!r.method || r.method === req.method()) && r.path.test(path));
    const { status = 200, body } = regla ? regla.respond(req, path) : { body: req.method() === 'GET' ? [] : {} };
    return route.fulfill({
      status, headers: { ...cors, 'content-type': 'application/json' },
      body: status === 204 ? '' : JSON.stringify(body ?? {}),
    });
  });
  return {
    llamadas,
    veces: (path, method) => llamadas.filter(l => {
      const [m, p] = l.split(' ');
      return (!method || m === method) && path.test(p);
    }).length,
  };
}

/** Las pruebas nunca cuentan visitas en GoatCounter. */
export async function sinAnalitica(page: Page): Promise<void> {
  await page.route(/gc\.zgo\.at\/count\.js/, r => r.fulfill({ contentType: 'text/javascript', body: 'window.goatcounter = { count: function () {} };' }));
  await page.route(/goatcounter\.com/, r => r.abort());
}

/** Junta los errores de JavaScript no atrapados (una pantalla en blanco suele empezar por uno). */
export function erroresDePagina(page: Page): string[] {
  const errores: string[] = [];
  page.on('pageerror', e => errores.push(e.message));
  return errores;
}

/** Ningún elemento debe obligar a desplazarse a los lados. */
export async function sinScrollHorizontal(page: Page): Promise<void> {
  const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
  expect(scroll, 'la página no debe desbordarse a los lados').toBeLessThanOrEqual(width + 1);
}

/**
 * La portada con un Tap (PR #45) se prueba contra el build local y en CI; iphone.yml corre contra producción, que hasta el
 * despliegue sigue sirviendo la portada anterior (con el mini simulacro `gems-hero-quiz`). Solo en ese caso la prueba se
 * omite: si producción ya tiene la portada nueva (o ninguna de las dos), corre y falla como debe.
 */
export async function omitirSiPortadaAnterior(page: Page): Promise<void> {
  await page.locator('gems-hero-quiz, gems-taps').first().waitFor({ state: 'attached', timeout: 15_000 }).catch(() => undefined);
  test.skip(await page.locator('gems-hero-quiz').count() > 0, 'producción aún sirve la portada anterior (sin Tap): se prueba al desplegar #45');
}
