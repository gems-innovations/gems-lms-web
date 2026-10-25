import {
  CINTA_TRANSPARENCIA, COPY_GANCHO, IAdjuntoBorrador, MARCA_ADJUNTO_FIN, MARCA_ADJUNTO_INICIO, MAX_ADJUNTO, MAX_MENSAJE_API, PASO_PUBLICAR, armarAdjunto,
  enlaceRegistro, extraerAdjunto, hitosCrear, leerBorradorId, mensajeConAdjunto, origenCrear, restaMensaje, validarAdjunto,
} from './taps.crear';

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
  it('lo demás (deshacer, compartir, gusto, abandono) no es hito del embudo', () => {
    const ya = new Set<string>();
    for (const n of ['deshacer', 'compartir/enlace', 'gusto/si', 'abandono/personaje/40', 'abrir/directo', 'probar']) expect(hitosCrear(n, ya)).toEqual([]);
    expect(ya.size).toBe(0);
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
    expect(a.bloque).toBe(`${MARCA_ADJUNTO_INICIO}\n${a.json}\n${MARCA_ADJUNTO_FIN}`);
    expect(a.miniatura).toBe('data:image/png;base64,AAAA');
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

describe('mensajeConAdjunto y extraerAdjunto', () => {
  const a = () => armarAdjunto(borrador(), ID, validar)!;
  it('pone el bloque al final, recorta lo escrito para que todo quepa en los 2000 del API', () => {
    const bloque = a().bloque;
    expect(mensajeConAdjunto('Quiero Taps para mi curso', bloque)).toBe(`Quiero Taps para mi curso\n\n${bloque}`);
    expect(mensajeConAdjunto('   ', bloque)).toBe(bloque);
    expect(mensajeConAdjunto('Hola', null)).toBe('Hola');
    const largo = mensajeConAdjunto('x'.repeat(5000), bloque);
    expect(largo.length).toBeLessThanOrEqual(MAX_MENSAJE_API);
    expect(largo.endsWith(bloque)).toBeTrue();
    expect(restaMensaje(bloque)).toBe(MAX_MENSAJE_API - bloque.length - 2);
    expect(restaMensaje(null)).toBe(MAX_MENSAJE_API);
  });
  it('lo que PR-9 leerá: del mensaje sale el mismo adjunto y el texto de la persona', () => {
    const r = extraerAdjunto(mensajeConAdjunto('Mi colegio', a().bloque), validar)!;
    expect(r.adjunto).toEqual(a().adjunto);
    expect(r.mensaje).toBe('Mi colegio');
    expect(extraerAdjunto('sin bloque', validar)).toBeNull();
    expect(extraerAdjunto(`${MARCA_ADJUNTO_INICIO}\n{roto\n${MARCA_ADJUNTO_FIN}`, validar)).toBeNull();
    expect(extraerAdjunto(null, validar)).toBeNull();
  });
});
