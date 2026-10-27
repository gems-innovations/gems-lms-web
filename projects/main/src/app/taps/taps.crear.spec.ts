import {
  CINTA_TRANSPARENCIA, CLAVE_ESTUDIANTE, COPY_GANCHO, HITOS_CUENTA, IAdjuntoBorrador, MAX_ADJUNTO, NOMBRES_ADJUNTO, PASO_PUBLICAR, armarAdjunto,
  destinoVolver, enlaceRegistro, hitosCrear, leerBorradorId, leerDraft, origenCrear, tituloGancho, validarAdjunto,
} from './taps.crear';

describe('destinoVolver (cabecera de marca de /crear)', () => {
  it('vuelve a donde se vino según ?desde=', () => {
    expect(destinoVolver('feed')).toEqual({ ruta: '/taps', texto: 'Volver a Taps' });
    expect(destinoVolver('instituciones')).toEqual({ ruta: '/instituciones', texto: 'Volver a instituciones' });
    expect(destinoVolver('instructor')).toEqual({ ruta: '/instructor', texto: 'Volver al panel' });
  });
  it('sin origen conocido (portada, directo, raro o nulo) vuelve a la portada', () => {
    for (const d of ['portada', 'enlace', 'continuar', 'directo', '<script>', '', null, undefined]) expect(destinoVolver(d).ruta).toBe('/');
    expect(destinoVolver(null).texto).toBe('Volver al inicio');
  });
});

describe('origenCrear', () => {
  it('?desde= conocido manda sobre lo que vio el diseñador', () => {
    expect(origenCrear('?desde=portada', 'abrir/directo')).toBe('portada');
    expect(origenCrear('?desde=feed', 'abrir/continuar')).toBe('feed');
    expect(origenCrear('?x=1&desde=instituciones', null)).toBe('instituciones');
  });
  it('sin ?desde= (o con uno raro) vale lo que detectó el diseñador', () => {
    expect(origenCrear('', 'abrir/enlace')).toBe('enlace');
    expect(origenCrear('?desde=cualquier-cosa', 'abrir/continuar')).toBe('continuar');
    expect(origenCrear('?desde=<script>', 'directo')).toBe('directo');
    expect(origenCrear('', null)).toBe('directo');
  });
});

describe('hitosCrear', () => {
  it('el primer gesto creativo cuenta `creo` una sola vez', () => {
    const ya = new Set<string>();
    expect(hitosCrear('preset/grabador', ya)).toEqual(['taps/crear/creo']);
    expect(hitosCrear('cambio/ropa', ya)).toEqual([]);
    expect(hitosCrear('sorprendeme/todo', ya)).toEqual([]);
  });
  it('llegar a «Listo» cierra el personaje (y cuenta `creo` si no se había contado)', () => {
    const ya = new Set<string>();
    expect(hitosCrear('paso/escenario', ya)).toEqual([]);
    expect(hitosCrear('paso/listo', ya)).toEqual(['taps/crear/creo', 'taps/crear/personaje-listo']);
    expect(hitosCrear('listo', ya)).toEqual([]);
  });
  it('lo demás (deshacer, compartir, gusto, abandono, hito alcanzado, aviso visto) no es hito del embudo', () => {
    const ya = new Set<string>();
    for (const n of ['deshacer', 'compartir/enlace', 'gusto/si', 'abandono/personaje/40', 'abrir/directo', 'probar', 'hito/listo', 'hito-cuenta/visto/listo', 'hito-cuenta/abrir/otro']) expect(hitosCrear(n, ya)).toEqual([]);
    expect(ya.size).toBe(0);
  });
  it('los avisos de cuenta (PR-D2) derivan `cuenta/<hito>/<abrir|entendido>`, una vez por visita cada par', () => {
    const ya = new Set<string>();
    expect(hitosCrear('hito-cuenta/abrir/listo', ya)).toEqual(['taps/crear/cuenta/listo/abrir']);
    expect(hitosCrear('hito-cuenta/abrir/listo', ya)).toEqual([]);
    expect(hitosCrear('hito-cuenta/entendido/navegador', ya)).toEqual(['taps/crear/cuenta/navegador/entendido']);
    expect(hitosCrear('hito-cuenta/abrir/navegador', ya)).toEqual(['taps/crear/cuenta/navegador/abrir']);
    for (const h of HITOS_CUENTA) expect(hitosCrear(`hito-cuenta/entendido/${h}`, new Set())).toEqual([`taps/crear/cuenta/${h}/entendido`]);
    expect(HITOS_CUENTA).toEqual(['navegador', 'listo', 'guardado', 'probado', 'vuelve']);
    expect(CLAVE_ESTUDIANTE).toBe('taps.crear.es-estudiante');
  });
});

describe('copy de /crear', () => {
  it('es honesto y sin emojis', () => {
    const emoji = /\p{Extended_Pictographic}/u;
    for (const t of [CINTA_TRANSPARENCIA, PASO_PUBLICAR, ...Object.values(COPY_GANCHO).flat()]) expect(t).not.toMatch(emoji);
    expect(CINTA_TRANSPARENCIA).toContain('sin cuenta');
    expect(CINTA_TRANSPARENCIA).toContain('se guarda en este navegador');
    expect(PASO_PUBLICAR).toBe('Publicar (con cuenta)');
  });
  it('la hoja del gancho no culpa, no apura ni pide datos al estudiante', () => {
    const todo = Object.values(COPY_GANCHO).flat().join(' ').toLowerCase();
    for (const prohibido of ['solo hoy', 'última oportunidad', 'no te quedes', 'date prisa', 'edad', 'teléfono', 'correo']) expect(todo).not.toContain(prohibido);
    expect(COPY_GANCHO.titulo).toContain('docente o institución');
    expect(COPY_GANCHO.estudianteDetalle.toLowerCase()).toContain('pídele a tu docente');
    expect(COPY_GANCHO.conserva).toContain('No pierdes nada');
    expect(COPY_GANCHO.ganas.length).toBe(3);
  });
  it('el título de la hoja lleva el nombre del personaje como texto (PR-D2) y sin nombre vuelve al general', () => {
    expect(tituloGancho('Nefer')).toBe('Para publicar a Nefer, regístrate como docente o institución');
    expect(tituloGancho('  ')).toBe(COPY_GANCHO.titulo);
    expect(tituloGancho(null)).toBe(COPY_GANCHO.titulo);
    expect(tituloGancho('<b>x</b>')).toContain('<b>x</b>');   // va por interpolación, nunca como HTML
  });
});

// ───────────── borrador adjunto (PR-8) ─────────────

/** Doble de validarLook (rig.js): solo acepta las piezas y colores de esta lista. */
const validar = (look: Record<string, unknown>): string[] => {
  const e: string[] = [];
  for (const [k, v] of Object.entries(look)) {
    if (k === 'hat' && v !== 'copa' && v !== 'none') e.push(`hat «${v}» no existe`);
    else if (k === 'glasses' && typeof v !== 'boolean') e.push('glasses debe ser true o false');
    else if (!['hat', 'glasses', 'coat', 'hair', 'skin'].includes(k)) e.push(`campo desconocido «${k}»`);
    else if (k !== 'hat' && k !== 'glasses' && !/^#[0-9a-f]{6}$/i.test(String(v))) e.push(`${k} debe ser un color #rrggbb`);
  }
  return e;
};
const ID = 'mh5k2x1a-0a1b2c3';
const borrador = (extra: Record<string, unknown> = {}) => JSON.stringify({
  v: 1, borradorId: ID, paso: 2, fecha: 1_700_000_000_000, base: 'grabador', look: { hat: 'copa', coat: '#223344', vest: null, glasses: false },
  item: 'pluma', world: 'taller-londres', miniatura: 'data:image/png;base64,AAAA', ...extra,
});

describe('leerBorradorId y enlaceRegistro', () => {
  it('acepta solo ids con la forma de guardado.js', () => {
    expect(leerBorradorId(`?borrador=${ID}&desde=crear`)).toBe(ID);
    expect(leerBorradorId('?desde=crear')).toBeNull();
    expect(leerBorradorId('?borrador=')).toBeNull();
    expect(leerBorradorId('?borrador=<script>alert(1)</script>')).toBeNull();
    expect(leerBorradorId('?borrador=abc')).toBeNull();
    expect(leerBorradorId('?borrador=' + 'a'.repeat(40) + '-0000000')).toBeNull();
    expect(leerBorradorId('')).toBeNull();
  });
  it('el enlace de «Soy docente» lleva al formulario con el borrador (si hay) y desde=crear', () => {
    expect(enlaceRegistro(ID)).toEqual({ ruta: '/instituciones', query: { desde: 'crear', borrador: ID }, fragment: 'solicitud' });
    expect(enlaceRegistro(null)).toEqual({ ruta: '/instituciones', query: { desde: 'crear' }, fragment: 'solicitud' });
  });
});

describe('armarAdjunto', () => {
  it('serializa el borrador compacto (claves de compartir.js + borradorId), sin nombre, miniatura ni vest nulo', () => {
    const a = armarAdjunto(borrador(), ID, validar)!;
    expect(a).not.toBeNull();
    expect(a.adjunto).toEqual({ v: 1, borradorId: ID, b: 'grabador', l: { hat: 'copa', coat: '#223344', glasses: false }, i: 'pluma', w: 'taller-londres' });
    expect(a.json).toBe(JSON.stringify(a.adjunto));
    expect(a.json).not.toContain('miniatura'); expect(a.json).not.toContain('fecha'); expect(a.json).not.toContain('paso');
    expect(a.json.length).toBeLessThanOrEqual(MAX_ADJUNTO);
    expect(a.json).not.toContain('[gems-borrador');
    expect(a.miniatura).toBe('data:image/png;base64,AAAA');
  });
  it('el lema del borrador (PR-D6) no viaja en el adjunto: el API solo acepta v, borradorId, b, l, i, w', () => {
    const a = armarAdjunto(borrador({ lema: 'Hoy aprendemos algo nuevo' }), ID, validar)!;
    expect(a).not.toBeNull();
    expect(Object.keys(a.adjunto).sort()).toEqual(['b', 'borradorId', 'i', 'l', 'v', 'w']);
    expect(a.json).not.toContain('lema'); expect(a.json).not.toContain('"m"'); expect(a.json).not.toContain('Hoy aprendemos');
    expect(a.adjunto.v).toBe(1);
  });
  it('la hora del día del borrador (PR-D8) no viaja en el adjunto y un escenario nuevo sí (el API decide si lo acepta)', () => {
    const a = armarAdjunto(borrador({ hora: 'noche', world: 'biblioteca' }), ID, validar)!;
    expect(a).not.toBeNull();
    expect(Object.keys(a.adjunto).sort()).toEqual(['b', 'borradorId', 'i', 'l', 'v', 'w']);
    expect(a.adjunto.w).toBe('biblioteca');
    expect(a.json).not.toContain('hora'); expect(a.json).not.toContain('"h"'); expect(a.json).not.toContain('noche');
  });
  it('sin borrador, con otro id, JSON roto o look inválido → null (el formulario sigue normal)', () => {
    expect(armarAdjunto(null, ID, validar)).toBeNull();
    expect(armarAdjunto(borrador(), null, validar)).toBeNull();
    expect(armarAdjunto(borrador(), 'otro1234-0000000', validar)).toBeNull();
    expect(armarAdjunto('{', ID, validar)).toBeNull();
    expect(armarAdjunto(borrador({ look: { hat: 'casco' } }), ID, validar)).toBeNull();
    expect(armarAdjunto(borrador({ look: { hat: 'copa', raro: 'x' } }), ID, validar)).toBeNull();
    expect(armarAdjunto(borrador({ look: 'texto' }), ID, validar)).toBeNull();
    expect(armarAdjunto(borrador({ world: 7 }), ID, validar)).toBeNull();
  });
  it('la miniatura solo cuenta si es una imagen data:', () => {
    expect(armarAdjunto(borrador({ miniatura: 'javascript:alert(1)' }), ID, validar)!.miniatura).toBe('');
    expect(armarAdjunto(borrador({ miniatura: undefined }), ID, validar)!.miniatura).toBe('');
  });
});

describe('validarAdjunto', () => {
  const bueno: IAdjuntoBorrador = { v: 1, borradorId: ID, b: 'grabador', l: { hat: 'copa' }, i: null, w: 'foro-roma' };
  it('acepta la forma cerrada y rechaza lo demás', () => {
    expect(validarAdjunto(bueno, validar)).toEqual(bueno);
    expect(validarAdjunto({ ...bueno, v: 2 }, validar)).toBeNull();
    expect(validarAdjunto({ ...bueno, borradorId: 'x' }, validar)).toBeNull();
    expect(validarAdjunto({ ...bueno, l: [] }, validar)).toBeNull();
    expect(validarAdjunto({ ...bueno, l: { hat: { a: 1 } } }, validar)).toBeNull();
    expect(validarAdjunto({ ...bueno, w: '' }, validar)).toBeNull();
    expect(validarAdjunto(null, validar)).toBeNull();
    expect(validarAdjunto('{}', validar)).toBeNull();
  });
  it('rellena base e item cuando faltan y recorta lo demasiado largo', () => {
    expect(validarAdjunto({ ...bueno, b: '', i: 42 }, validar)).toEqual({ ...bueno, b: 'sorpresa', i: null });
    expect(validarAdjunto({ ...bueno, w: 'w'.repeat(100) }, validar)!.w.length).toBe(40);
  });
  it('rechaza un adjunto que no cabe', () => {
    const grande = { ...bueno, l: Object.fromEntries(Array.from({ length: 300 }, (_, i) => [`c${i}`, '#000000'])) };
    const todoVale = (): string[] => [];
    expect(validarAdjunto(grande, todoVale)).toBeNull();
  });
});

describe('leerDraft (lo que devuelve el API en /solicitudes)', () => {
  const a = () => armarAdjunto(borrador(), ID, validar)!;
  it('del string que mandó el formulario sale el mismo adjunto, con nombres legibles y muestras de color', () => {
    const r = leerDraft(a().json)!;
    expect(r).not.toBeNull();
    expect(r.adjunto).toEqual(a().adjunto);
    expect(r.base).toBe(NOMBRES_ADJUNTO['grabador']);
    expect(r.objeto).toBe('Pluma');
    expect(r.escenario).toBe('Taller de Londres');
    expect(r.colores).toEqual([{ nombre: 'Prenda', hex: '#223344' }]);
  });
  it('sin objeto y con base desconocida: «Sin objeto» y «Sorpréndeme»; los colores en mayúsculas se normalizan', () => {
    const r = leerDraft(JSON.stringify({ v: 1, borradorId: ID, b: 'sorpresa', l: { skin: '#C99A76', hat: 'none' }, i: null, w: 'foro-roma' }))!;
    expect(r.base).toBe('Sorpréndeme');
    expect(r.objeto).toBe('Sin objeto');
    expect(r.escenario).toBe('Foro de Roma');
    expect(r.colores).toEqual([{ nombre: 'Piel', hex: '#c99a76' }]);
  });
  it('nulo, vacío, JSON roto, forma distinta, demasiado grande o con valores raros → null (la solicitud se enseña sin personaje)', () => {
    expect(leerDraft(null)).toBeNull();
    expect(leerDraft(undefined)).toBeNull();
    expect(leerDraft('')).toBeNull();
    expect(leerDraft('{roto')).toBeNull();
    expect(leerDraft('[]')).toBeNull();
    expect(leerDraft('"texto"')).toBeNull();
    expect(leerDraft(JSON.stringify({ v: 2, borradorId: ID, b: 'grabador', l: {}, i: null, w: 'foro-roma' }))).toBeNull();
    expect(leerDraft(JSON.stringify({ v: 1, borradorId: '<script>', b: 'grabador', l: {}, i: null, w: 'foro-roma' }))).toBeNull();
    expect(leerDraft(JSON.stringify({ v: 1, borradorId: ID, b: 'grabador', l: { coat: { a: 1 } }, i: null, w: 'foro-roma' }))).toBeNull();
    expect(leerDraft(JSON.stringify({ v: 1, borradorId: ID, b: 'grabador', l: { '<b>': 'x' }, i: null, w: 'foro-roma' }))).toBeNull();
    expect(leerDraft('x'.repeat(MAX_ADJUNTO + 1))).toBeNull();
    expect(leerDraft({ v: 1 } as unknown)).withContext('el API siempre devuelve string; un objeto no se interpreta').toBeNull();
  });
  it('el look se valida contra el catálogo cerrado (piezas, colores #rrggbb o null, glasses booleano); lo demás es null', () => {
    const con = (l: Record<string, unknown>) => leerDraft(JSON.stringify({ v: 1, borradorId: ID, b: 'grabador', l, i: null, w: 'foro-roma' }));
    expect(con({ coat: 'red', hat: 'copa' })).toBeNull();
    expect(con({ hat: 'casco' })).toBeNull();
    expect(con({ glasses: 'si' })).toBeNull();
    expect(con({ raro: '#000000' })).toBeNull();
    expect(con({ hat: 'copa', vest: null, glasses: true, coat: '#112233' })!.colores).toEqual([{ nombre: 'Prenda', hex: '#112233' }]);
  });
  it('los escenarios nuevos (PR-D8) tienen nombre legible en el panel', () => {
    const r = leerDraft(JSON.stringify({ v: 1, borradorId: ID, b: 'grabador', l: { hat: 'none' }, i: null, w: 'observatorio' }))!;
    expect(r.escenario).toBe('Observatorio');
  });
  it('etiquetas raras en objeto o escenario no se enseñan tal cual: caen al genérico', () => {
    const r = leerDraft(JSON.stringify({ v: 1, borradorId: ID, b: 'grabador', l: { hat: 'copa' }, i: 'x y', w: 'w<1>' }))!;
    expect(r).not.toBeNull();
    expect(r.colores).toEqual([]);
    expect(r.objeto).toBe('Objeto');
    expect(r.escenario).toBe('Escenario');
  });
});
