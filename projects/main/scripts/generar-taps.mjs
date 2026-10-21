#!/usr/bin/env node
// Genera los Taps de la app a partir del banco de preguntas.
//
//   npm run taps:generar              escribe src/app/taps/taps.banco.generated.ts
//   npm run taps:generar -- --check   falla si el archivo generado no coincide con el banco (para CI)
//
// Fuente de verdad: src/app/taps/banco/{minecraft,logica,cultura}.json (copia del banco que se escribe y revisa en
// gems-lms/producto/taps/banco). Para actualizarlo: copia los tres JSON del banco sobre esa carpeta, corre
// `npm run taps:generar` y sube los JSON y el .generated.ts juntos. El build NO corre el generador: el .ts va en git
// (así el build no depende de nada fuera del repo) y la prueba `generar-taps.test.mjs` avisa si quedó desactualizado.
//
// Formato del banco: ver src/app/taps/banco/LEEME.md. Un Tap (en "taps" del JSON) puede llevar además
//   "retirado": true   → no se publica (su id sale en TAPS_RETIRADOS: el enlace compartido avisa «este Tap se retiró»).
//   "resultados": [..] → títulos propios (si no, los de su subtema en "titulosPorSubtema" y, si tampoco, "titulosResultado").
// En el banco, "titulosPorSubtema": { "<subtema>": [..] } da títulos distintos a cada subtema (redstone, mobs, series…), y
// cada título puede traer "lineas": [..] (hasta 2 variantes más de su "line"): la app elige una con semilla al mostrarlo.
//
// Asignación de escena (tema visual, personaje, mundo, objeto en la mano, encuadre, entrada y decorado): reglas fijas y
// deterministas, sin azar. Cada Tap publicado tiene su lugar en LUGARES; uno nuevo usa la lista de (mundo, objeto) de su
// subtema (el n-ésimo Tap de ese subtema usa el n-ésimo par, dando la vuelta). Personaje, encuadre y entrada rotan por el
// orden del Tap dentro de su tema. El Tap de gancho usa siempre la escena de ESCENA_GANCHO, centrado y saludando.
// Una pregunta puede traer "tipo": "duo" (2 opciones una contra otra, con cuenta regresiva) o "vf" (verdadero/falso, opciones
// ["Verdadero", "Falso"]); sin "tipo" es clásica de 4 opciones (ver TIPOS). Un Tap puede mezclar formatos.
// Una pregunta puede traer "visual": { objeto, accion, valor? } (objeto para explicar tras responder; catálogo en el
// theme.json de su tema → visuals.objects). El generador lo copia tal cual y falla si el objeto o la acción no existen.
// Temas con registro (theme.json → "personajes"/"fondos", p. ej. «aventura»): personaje y fondo salen de elegirParaTap()
// (public/taps-engine/registro.js) por el orden del Tap: deterministas, sin repetir entre Taps seguidos, sin objeto en la mano.
// Añadir un personaje o fondo al theme.json basta para que entre en la rotación (ver taps-engine/personajes/LEEME.md).
// Y "escena": { tipo: codigo | operacion | serie | objeto | diagrama, … } (elemento visual de la PREGUNTA, ver validarEscena):
// se copia si cumple el formato, existe en el tema (escenas.objects) y no muestra escrita la opción correcta.
// Modo cine (asignarCine): sobre esa escena se reparten plano de cámara, hora, clima, fauna, transición, encuadre y entrada
// (y el personaje en los temas sin registro) para que los Taps seguidos del feed nunca se vean iguales (ver taps.cine.spec.ts).
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { elegirParaTap, fondoComoTema, personajeComoTema, urlFondo, urlPersonaje, validarFondo, validarPersonaje } from '../public/taps-engine/registro.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const APP = join(AQUI, '../src/app');
export const RUTAS = {
  banco: join(APP, 'taps/banco'),
  retos: join(APP, 'public/retos.data.ts'),
  temas: join(AQUI, '../public/taps-engine/themes'),
  salida: join(APP, 'taps/taps.banco.generated.ts'),
  /** Calendario del reto del día (versionado): los días ya asignados nunca cambian. */
  calendario: join(AQUI, 'reto-calendario.json'),
  /** Índice agregado de personajes y fondos del registro: el motor lo pide en UNA petición al abrir un tema. */
  registro: join(AQUI, '../public/taps-engine/registro.json'),
};

/**
 * Reto del día (auditoria-permanencia.md, mejora 4): calendario fijo, generado aquí y guardado en git.
 * - `inicio` es el reto #1 (un lunes); `dias` es cuántos días cubre (366 al publicar el reto; 420 desde la ronda 2 del
 *   banco, para que sus 45 Taps entren en los días agregados: del 2027-10-20 al 2027-12-11; 427 con los 4 Taps de formatos
 *   mezclados, que entran del 2027-12-12 al 2027-12-18). El tema de cada día rota por `rotacion` (lunes primero).
 * - Solo crece hacia el futuro: los días que ya están en reto-calendario.json no se tocan nunca, así que agregar Taps al
 *   banco no cambia ni los días pasados ni el de hoy. Para que los Taps nuevos entren al reto se sube `dias` (se agregan
 *   días al final). Un Tap retirado se reemplaza solo en los días que lo tenían.
 * - Dentro de cada tema se recorren todos sus Taps (sin los de gancho) antes de repetir, intercalando subtemas: nunca dos
 *   días seguidos del mismo tema con el mismo subtema si se puede evitar.
 * - Más allá del calendario, la app usa un respaldo determinista (taps.reto.ts) hasta que se extienda.
 */
export const RETO = {
  inicio: '2026-10-19',
  dias: 427,
  rotacion: ['minecraft', 'logica', 'cultura', 'minecraft', 'logica', 'cultura', 'minecraft'],
};

/** Hash estable con avalancha (FNV-1a + mezcla final de murmur3): cambiar una letra reparte el resultado. */
export function hashAvalancha(texto) {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h >>> 0;
}

/**
 * Una vuelta por los Taps de un tema, intercalando subtemas: cada subtema reparte sus Taps a lo largo de la vuelta
 * (posición (k + ½) / tamaño) y nunca se repite el subtema anterior si queda otro.
 */
export function vueltaIntercalada(taps, previo = null) {
  const grupos = new Map();
  for (const t of taps) grupos.set(t.subtopic ?? 'mixto', [...(grupos.get(t.subtopic ?? 'mixto') ?? []), t]);
  const colas = [...grupos.entries()]
    .sort((a, b) => hashAvalancha(a[0]) - hashAvalancha(b[0]))
    .map(([sub, lista]) => ({ sub, lista: [...lista].sort((a, b) => hashAvalancha(a.id) - hashAvalancha(b.id) || a.id.localeCompare(b.id)), k: 0 }));
  const out = [];
  let ultimo = previo;
  while (out.length < taps.length) {
    const vivas = colas.filter(c => c.k < c.lista.length)
      .sort((a, b) => (a.k + 0.5) / a.lista.length - (b.k + 0.5) / b.lista.length);
    const c = vivas.find(v => v.sub !== ultimo) ?? vivas[0];
    out.push(c.lista[c.k++]);
    ultimo = c.sub;
  }
  return out;
}

/**
 * Calendario del reto: conserva los días de `previo` (si su Tap sigue publicado) y completa hasta `RETO.dias` siguiendo la
 * rotación de temas y las vueltas intercaladas. Devuelve { inicio, dias: [id…] }.
 */
export function calendarioReto(taps, previo = null, reto = RETO) {
  const publicados = new Set(taps.map(t => t.id));
  const fijos = previo && previo.inicio === reto.inicio && Array.isArray(previo.dias) ? previo.dias : [];
  const porTema = new Map();
  for (const t of taps) if (!t.hook) porTema.set(t.topic, [...(porTema.get(t.topic) ?? []), t]);
  const estado = new Map();                                       // tema → { cola, ultimoSub }
  const dias = [];
  const total = Math.max(reto.dias, fijos.length);
  for (let d = 0; d < total; d++) {
    const tema = reto.rotacion[d % 7], pool = porTema.get(tema) ?? [];
    if (!pool.length) throw new Error(`reto del día: el tema «${tema}» no tiene Taps`);
    const e = estado.get(tema) ?? { cola: [], ultimoSub: null };
    if (!e.cola.length) e.cola = vueltaIntercalada(pool, e.ultimoSub);
    const fijo = fijos[d];
    let tap;
    if (fijo && publicados.has(fijo)) {
      tap = taps.find(t => t.id === fijo);
      const i = e.cola.findIndex(t => t.id === fijo);
      if (i >= 0) e.cola.splice(i, 1);
    } else {
      // Tras los días fijos la cola puede empezar con el subtema del último día fijo: se toma el primero que no lo repita.
      const i = e.cola.findIndex(t => (t.subtopic ?? 'mixto') !== e.ultimoSub);
      tap = e.cola.splice(i >= 0 ? i : 0, 1)[0];
    }
    e.ultimoSub = tap.subtopic ?? 'mixto';
    estado.set(tema, e);
    dias.push(tap.id);
  }
  return { inicio: reto.inicio, dias };
}

export function leerCalendario(ruta = RUTAS.calendario) {
  if (!existsSync(ruta)) return null;
  try { return JSON.parse(readFileSync(ruta, 'utf8')); } catch (e) { throw new Error(`reto-calendario.json: JSON inválido (${e.message})`); }
}

/** Texto del calendario versionado (un id por línea: los cambios se leen bien en git). */
export function emitirCalendario(cal) {
  return `{\n  "inicio": ${JSON.stringify(cal.inicio)},\n  "dias": [\n${cal.dias.map(id => `    ${JSON.stringify(id)}`).join(',\n')}\n  ]\n}\n`;
}

/** Mismos límites que `validar.mjs` del banco (y que los de la interfaz: la pregunta cabe en 5 líneas). */
export const LIMITES = { pregunta: 120, opcion: 22, explicacion: 90, opciones: 4, opcionesDuo: 2, preguntasPorTap: 5, linea: 110, lineasExtra: 2 };
/**
 * Formatos de pregunta (campo opcional `tipo`; sin él, clásica de 4 opciones). `duo`: 2 opciones grandes una contra otra con
 * cuenta regresiva; `vf`: verdadero o falso, con `options` exactamente ["Verdadero", "Falso"] (se responde tocando o deslizando).
 */
export const TIPOS = ['clasica', 'duo', 'vf'];
export const OPCIONES_VF = ['Verdadero', 'Falso'];

/** Archivo del banco → tema del motor, categoría del selector (`?tema=`) y rótulo. */
export const TEMAS = {
  minecraft: { archivo: 'minecraft.json', theme: 'minecraft', topic: 'minecraft', kicker: 'Quiz de bloques', prefijo: 'mc-', personajes: ['leo', 'sofi', 'mateo', 'dani'] },
  logica: { archivo: 'logica.json', theme: 'estudio', topic: 'logica', kicker: 'Lógica y trampas', prefijo: 'lg-', personajes: ['chispa', 'nube'] },
  // Cultura usa el tema «aventura» (personajes y fondos del registro). Para volver a los robots: theme: 'estudio' (LUGARES y
  // ESCENA_GANCHO de cultura siguen escritos para estudio) y personajes: ['nube', 'chispa'].
  cultura: { archivo: 'cultura.json', theme: 'aventura', topic: 'cultura', kicker: 'Cultura general', prefijo: 'cu-', personajes: null },
};

/** Objetos que cada tema dibuja en la mano (renderer3d.js ITEMS / rig.js ITEMS). */
export const OBJETOS = {
  minecraft: ['sword', 'pick', 'axe', 'torch', 'diamond', 'apple', 'grass', 'tnt'],
  estudio: ['matraz', 'lupa', 'libro'],
  aventura: [],
};

/** Escena del Tap de gancho de cada tema (la primera impresión: clara y conocida). */
export const ESCENA_GANCHO = {
  minecraft: { world: 'pradera', host: 'leo', item: 'pick' },
  logica: { world: 'aula', host: 'chispa', item: 'lupa' },
  cultura: { world: 'laboratorio', host: 'nube', item: 'matraz' },
};

/**
 * Lugar de cada Tap publicado: [mundo, objeto en la mano, decorado | null]. Así cada Tap se siente en un sitio propio y
 * acorde a lo que pregunta (el viaje al Nether pasa en el Nether, la redstone en una cueva con circuitos, las series en el
 * aula). Un Tap nuevo que no esté aquí usa las reglas por subtema de ESCENAS (sin decorado).
 */
export const LUGARES = {
  'mc-crafteo-1': ['pradera', 'axe', 'taller'], 'mc-mascotas': ['aldea', 'apple', 'corral'], 'mc-nether-2': ['nether', 'sword', 'portal'],
  'mc-secretos': ['nieve', 'diamond', 'iglu'], 'mc-nether-1': ['nether', 'sword', 'portal'], 'mc-mundo': ['bosque', 'sword', 'corral'],
  'mc-crafteo-2': ['aldea', 'pick', 'taller'], 'mc-monstruos': ['noche', 'torch', 'campamento'], 'mc-redstone-1': ['cueva', 'pick', 'circuito'],
  'mc-end': ['end', 'diamond', 'cristales'], 'mc-redstone-3': ['cueva', 'torch', 'circuito'], 'mc-encantamientos': ['casa', 'diamond', 'biblioteca'],
  'mc-mineria': ['cueva', 'pick', 'mina'], 'mc-nether-3': ['nether', 'diamond', 'portal'], 'mc-rayos': ['desierto', 'sword', 'ruinas'],
  'mc-noche-1': ['noche', 'torch', 'campamento'], 'mc-nuevos': ['playa', 'apple', 'muelle'], 'mc-redstone-2': ['noche', 'pick', 'circuito'],
  'mc-leyendas': ['desierto', 'pick', 'ruinas'], 'mc-noche-2': ['nieve', 'axe', 'campamento'], 'mc-mezcla': ['bosque', 'axe', 'granja'],
  'mc-taller': ['casa', 'axe', 'taller'],
  'lg-adivinanzas-1': ['cocina', 'libro', 'reloj'], 'lg-zorgs': ['espacio', 'lupa', 'cohete'], 'lg-lee-bien-2': ['biblioteca', 'lupa', 'libros'],
  'lg-calendario': ['aula', 'libro', 'reloj'], 'lg-azar': ['jardin', 'lupa', 'planta'], 'lg-series-1': ['laboratorio', 'lupa', 'microscopio'],
  'lg-lateral': ['observatorio', 'lupa', 'telescopio'], 'lg-series-2': ['aula', 'libro', 'reloj'], 'lg-lluvia': ['jardin', 'libro', 'planta'],
  'lg-adivinanzas-2': ['biblioteca', 'libro', 'reloj'], 'lg-rapidas': ['cocina', 'lupa', 'reloj'], 'lg-adivinanzas-3': ['biblioteca', 'libro', 'globo'],
  'lg-mezcla': ['museo', 'lupa', 'mapa'],
  'cu-cuerpo-1': ['laboratorio', 'lupa', 'microscopio'], 'cu-espacio-1': ['observatorio', 'lupa', 'telescopio'], 'cu-datos': ['biblioteca', 'libro', 'globo'],
  'cu-animales-1': ['jardin', 'lupa', null], 'cu-ciencia-1': ['cocina', 'matraz', null], 'cu-geografia-2': ['museo', 'libro', 'mapa'],
  'cu-cuerpo-2': ['laboratorio', 'matraz', 'libros'], 'cu-geografia-1': ['museo', 'lupa', 'globo'], 'cu-mitos': ['biblioteca', 'lupa', 'libros'],
  'cu-animales-2': ['jardin', 'libro', 'planta'], 'cu-espacio-2': ['espacio', 'lupa', 'cohete'], 'cu-gigantes': ['observatorio', 'libro', 'globo'],
  'cu-animales-3': ['aula', 'libro', 'planta'], 'cu-luz-sonido': ['cocina', 'matraz', null], 'cu-rarezas': ['laboratorio', 'lupa', 'planta'],
};

/**
 * Encuadre y entrada del personaje (claves de `shots` y `enters` del theme.json). Rotan por el orden del Tap dentro de su
 * tema (con un desfase por categoría) para que al deslizar el personaje no quede siempre en el mismo sitio ni entre igual.
 * El Tap de gancho va centrado y saluda. Todo es determinista: el servidor y el navegador ven la misma escena.
 */
export const ENCUADRES = ['izquierda', 'derecha', 'cerca-izquierda', 'lejos', 'cerca-derecha', 'centro'];
export const ENTRADAS = { minecraft: ['camina', 'salta', 'gira', 'saluda'], estudio: ['vuela', 'cae', 'aparece', 'saluda'], aventura: ['camina', 'salta', 'gira', 'saluda'] };
const DESFASE = { minecraft: 0, logica: 0, cultura: 3 };

/** Por tema y subtema: [mundo, objeto] que se reparten por orden. `_` es la lista de cualquier subtema sin regla propia. */
export const ESCENAS = {
  minecraft: {
    mobs: [['noche', 'sword'], ['bosque', 'sword'], ['noche', 'torch'], ['desierto', 'sword']],
    'nether-end': [['nether', 'sword'], ['end', 'sword'], ['nether', 'diamond'], ['end', 'diamond']],
    crafteos: [['bosque', 'axe'], ['pradera', 'pick'], ['cueva', 'torch']],
    redstone: [['cueva', 'pick'], ['cueva', 'torch'], ['noche', 'pick']],
    supervivencia: [['pradera', 'apple'], ['nieve', 'torch'], ['desierto', 'axe'], ['noche', 'torch']],
    curiosidades: [['pradera', 'diamond'], ['nieve', 'apple']],
    biomas: [['desierto', 'pick'], ['playa', 'apple'], ['nieve', 'axe']],
    aldeas: [['aldea', 'apple'], ['aldea', 'sword']],
    _: [['bosque', 'axe'], ['noche', 'torch'], ['pradera', 'apple'], ['desierto', 'pick'], ['nieve', 'sword']],
  },
  logica: {
    adivinanzas: [['aula', 'libro'], ['laboratorio', 'libro']],
    silogismos: [['aula', 'lupa'], ['aula', 'libro']],
    series: [['laboratorio', 'lupa'], ['espacio', 'lupa']],
    'lee-bien': [['biblioteca', 'libro'], ['aula', 'lupa']],
    lateral: [['observatorio', 'lupa'], ['museo', 'lupa']],
    'azar-y-numeros': [['jardin', 'lupa'], ['cocina', 'libro']],
    codigo: [['laboratorio', 'libro'], ['espacio', 'lupa']],
    _: [['aula', 'lupa'], ['espacio', 'lupa'], ['aula', 'libro'], ['laboratorio', 'lupa']],
  },
  cultura: {
    'cuerpo-humano': [['laboratorio', 'matraz'], ['laboratorio', 'lupa']],
    espacio: [['espacio', 'lupa'], ['espacio', 'libro']],
    animales: [['aula', 'libro'], ['aula', 'lupa']],
    'ciencia-cotidiana': [['laboratorio', 'matraz'], ['laboratorio', 'libro']],
    geografia: [['aula', 'libro'], ['espacio', 'libro']],
    'datos-sorprendentes': [['aula', 'lupa'], ['laboratorio', 'lupa'], ['espacio', 'lupa']],
    _: [['laboratorio', 'matraz'], ['aula', 'libro'], ['espacio', 'lupa']],
  },
};

/** Lee RETOS y BLOQUES de retos.data.ts sin compilar TypeScript (quita las anotaciones de tipo). */
export function leerRetos(ruta = RUTAS.retos) {
  let src = readFileSync(ruta, 'utf8');
  src = src.replace(/export interface [\s\S]*?\r?\n}\r?\n/g, '').replace(/export const (\w+)\s*:\s*[^=]+=/g, 'const $1 =');
  // eslint-disable-next-line no-new-func
  const { RETOS, BLOQUES } = new Function(`${src}; return { RETOS, BLOQUES };`)();
  return { RETOS: new Map(RETOS.map(r => [r.id, r])), BLOQUES: new Map(BLOQUES.map(r => [r.id, r])) };
}

/**
 * Mundos, personajes, encuadres, entradas, decorados, objetos para explicar, escenas de pregunta y modo cine de cada tema
 * del motor (y los colores de carga).
 */
export function leerTemas(carpeta = RUTAS.temas) {
  const salida = {};
  for (const id of Object.keys(OBJETOS)) {
    const t = expandirRegistro(JSON.parse(readFileSync(join(carpeta, id, 'theme.json'), 'utf8')), join(carpeta, '..'));
    salida[id] = {
      mundos: t.scenes, personajes: new Set(Object.keys(t.characters)), encuadres: new Set(Object.keys(t.shots ?? {})),
      entradas: new Set(t.enters ?? []), decorados: new Set(Object.keys(t.props ?? {})), objetos: t.visuals?.objects ?? {},
      registro: Array.isArray(t.personajes) ? { personajes: t.personajes, fondos: t.fondos ?? [] } : null,
      escenas: new Set(t.escenas?.objects ?? []), cine: t.cine ?? null,
    };
  }
  return salida;
}

/**
 * Versión síncrona de expandirTema() (registro.js) para el generador: lee personajes/<id>/personaje.json y
 * fondos/<id>/fondo.json de disco. Aquí un manifiesto roto SÍ es un error (en el navegador solo se salta).
 */
export function expandirRegistro(t, motor = join(RUTAS.temas, '..')) {
  if (!Array.isArray(t.personajes) && !Array.isArray(t.fondos)) return t;
  const base = pathToFileURL(motor + '/'), errores = [];
  const cargar = (ids, url, validar, convertir, destino, tipo) => {
    for (const id of ids ?? []) {
      const u = url(id, base);
      if (!existsSync(u)) { errores.push(`${tipo} «${id}»: falta ${fileURLToPath(u)}`); continue; }
      const m = JSON.parse(readFileSync(u, 'utf8')), e = validar(m, id);
      if (e.length) errores.push(`${tipo} «${id}»: ${e.join('; ')}`); else destino[id] = convertir(m, u);
    }
  };
  t.characters = { ...(t.characters ?? {}) }; t.scenes = { ...(t.scenes ?? {}) };
  cargar(t.personajes, urlPersonaje, validarPersonaje, personajeComoTema, t.characters, 'personaje');
  cargar(t.fondos, urlFondo, validarFondo, fondoComoTema, t.scenes, 'fondo');
  if (errores.length) throw new Error(`registro del tema «${t.id}»: ${errores.join(' | ')}`);
  return t;
}

let temasCache = null;
const registroDe = theme => (temasCache ??= leerTemas())[theme]?.registro ?? null;

// ───────────────────────── escena de la pregunta ─────────────────────────
/** Límites de la tarjeta (que quepa sin achicar demasiado la letra en un celular de 320 px). */
export const LIMITES_ESCENA = { lineasCodigo: 7, largoCodigo: 30, lineasOperacion: 4, largoOperacion: 16, itemsSerie: [3, 8], largoItem: 4, texto: 28 };
const quitarTildes = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
/** Todo el texto visible de una escena (para buscar si delata la respuesta). */
const textoEscena = e => [...(e.lineas ?? []), ...(e.items ?? []), e.texto ?? ''].join(' \n ');

/**
 * Revisa la escena de una pregunta: formato, tamaños, objetos del catálogo del tema (theme.json → escenas.objects) y que
 * NO delate la respuesta (la opción correcta no puede aparecer escrita en la escena).
 */
export function validarEscena(e, pregunta, catalogo, donde) {
  if (e === undefined) return [];
  const L = LIMITES_ESCENA, mal = m => [`${donde}: escena ${m}`];
  if (!e || typeof e !== 'object') return mal('debe ser un objeto { tipo, … }');
  const textos = l => Array.isArray(l) && l.every(x => typeof x === 'string' && x.length);
  if (e.texto !== undefined && (typeof e.texto !== 'string' || !e.texto.trim() || e.texto.length > L.texto)) return mal(`«texto» debe tener de 1 a ${L.texto} caracteres`);
  if (e.tipo === 'codigo') {
    if (!textos(e.lineas) || e.lineas.length > L.lineasCodigo) return mal(`«codigo» lleva de 1 a ${L.lineasCodigo} líneas de texto`);
    const larga = e.lineas.find(l => l.length > L.largoCodigo); if (larga) return mal(`la línea «${larga}» pasa de ${L.largoCodigo} caracteres`);
    if (e.lenguaje !== undefined && !['pseudo', 'python', 'js'].includes(e.lenguaje)) return mal('«lenguaje» debe ser pseudo, python o js');
  } else if (e.tipo === 'operacion') {
    if (!textos(e.lineas) || e.lineas.length > L.lineasOperacion) return mal(`«operacion» lleva de 1 a ${L.lineasOperacion} líneas`);
    const larga = e.lineas.find(l => l.length > L.largoOperacion); if (larga) return mal(`la línea «${larga}» pasa de ${L.largoOperacion} caracteres`);
  } else if (e.tipo === 'serie') {
    if (!textos(e.items) || e.items.length < L.itemsSerie[0] || e.items.length > L.itemsSerie[1]) return mal(`«serie» lleva de ${L.itemsSerie[0]} a ${L.itemsSerie[1]} fichas`);
    if (e.items.some(x => x.length > L.largoItem)) return mal(`cada ficha de la serie tiene como mucho ${L.largoItem} caracteres`);
    if (!e.items.includes('?')) return mal('la serie debe tener una ficha «?» (lo que se pregunta)');
  } else if (e.tipo === 'objeto' || e.tipo === 'diagrama') {
    if (typeof e.cosa !== 'string' || !catalogo?.has(e.cosa)) return mal(`«${e.cosa}» no existe en el tema (${[...(catalogo ?? [])].join(', ') || 'sin escenas'})`);
  } else return mal(`tipo «${e.tipo}» desconocido (codigo, operacion, serie, objeto o diagrama)`);
  // No delatar la respuesta: la opción correcta no puede verse escrita en la tarjeta.
  const correcta = quitarTildes(pregunta.options?.[pregunta.answer] ?? '').trim(), visto = quitarTildes(textoEscena(e));
  if (/^\d+([.,]\d+)?$/.test(correcta)) { if (visto.split(/[^0-9.,]+/).includes(correcta)) return mal(`delata la respuesta: muestra «${correcta}»`); }
  else if (correcta.length >= 3 && new RegExp(`(^|[^a-z0-9])${correcta.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9])`).test(visto)) return mal(`delata la respuesta: muestra «${correcta}»`);
  return [];
}

// ───────────────────────── modo cine: variedad entre Taps ─────────────────────────
/**
 * Cada Tap recibe un plano de cámara, hora del día, clima, fauna de fondo y transición (claves de theme.json → cine), y su
 * personaje, encuadre y entrada se reparten de nuevo. Todo es determinista (sin azar). La meta: que al deslizar 15 Taps
 * seguidos nunca se sientan iguales. Para eso se simulan los órdenes reales del feed (los mismos algoritmos que
 * taps.logic.ts: «Para ti» con y sin gancho, y cada categoría sola) y se reparte con un coloreo voraz: cada Tap evita lo que
 * ya tienen sus vecinos (a 1 y a 2 de distancia) y, a igualdad, usa lo menos usado. La prueba taps.cine.spec.ts verifica la
 * variedad con las funciones reales del feed.
 */
export const PLANOS = ['general', 'cenital', 'picado', 'contrapicado', 'primer-plano', 'travelling', 'orbita', 'diagonal'];
export const HORAS = ['dia', 'tarde', 'amanecer', 'noche'];
export const TRANSICIONES = ['corte', 'barrido', 'zoom', 'fundido'];
/** El Tap de gancho (la primera impresión) siempre igual: plano amable, de día y con fundido. */
export const CINE_GANCHO = { minecraft: { camara: 'orbita', hora: 'dia', transicion: 'fundido' }, logica: { camara: 'travelling', hora: 'dia', transicion: 'fundido' }, cultura: { camara: 'primer-plano', hora: 'dia', transicion: 'fundido' } };

const NIVEL = { facil: 1, media: 2, dificil: 3 };
const SAWTOOTH = [0.1, 0.4, 0.9, 0.2, 0.55, 0.65, 0.97];
/** Copia de `sawtoothOrder` de taps.logic.ts (la prueba de Karma confirma que el reparto sirve con el original). */
export function ordenSierra(taps) {
  const nivel = t => NIVEL[t.level ?? 'media'];
  const hooks = taps.filter(t => t.hook), rest = taps.filter(t => !t.hook);
  const share = n => (rest.length ? rest.filter(t => nivel(t) === n).length / rest.length : 0);
  const easy = share(1), middle = easy + share(2), out = [...hooks];
  for (let step = 0; rest.length; step++) {
    const q = SAWTOOTH[step % SAWTOOTH.length], wanted = q < easy ? 1 : q < middle ? 2 : 3;
    let pick = 0, best = Infinity;
    rest.forEach((t, i) => { const d = Math.abs(nivel(t) - wanted); if (d < best) { best = d; pick = i; } });
    out.push(rest.splice(pick, 1)[0]);
  }
  return out;
}
/** Copia de `mixFeed` de taps.logic.ts. */
export function ordenParaTi(taps, hookDone = false) {
  const hooks = taps.filter(t => t.hook), queued = hookDone ? taps.filter(t => !t.hook) : [...taps];
  const by = new Map();
  for (const t of queued) by.set(t.topic, [...(by.get(t.topic) ?? []), t]);
  const queues = new Map([...by].map(([k, l]) => [k, ordenSierra(l)])), lastSeen = new Map([...by.keys()].map(k => [k, -1])), out = [];
  while (out.length < queued.length) {
    const lastTopic = out.length ? out[out.length - 1].topic : null, tail = out.slice(-2);
    const full = tail.length === 2 && tail.every(t => t.topic === lastTopic);
    const open = [...queues.entries()].filter(([, q]) => q.length > 0), allowed = open.filter(([k]) => !(full && k === lastTopic));
    const [topic, queue] = (allowed.length ? allowed : open).sort((a, b) => b[1].length - a[1].length || lastSeen.get(a[0]) - lastSeen.get(b[0]))[0];
    out.push(queue.shift()); lastSeen.set(topic, out.length);
  }
  return hookDone ? [...out, ...hooks] : out;
}

/** Reparte el modo cine (y personaje, encuadre y entrada) sobre los Taps ya generados. Modifica `taps[i].scene`. */
export function asignarCine(taps, temas) {
  const ordenes = [ordenParaTi(taps), ordenParaTi(taps, true), ...[...new Set(taps.map(t => t.topic))].map(k => ordenSierra(taps.filter(t => t.topic === k)))];
  const cerca = new Map(taps.map(t => [t.id, new Map()]));                   // id → (id vecino → peso: 3 a distancia 1, 1 a distancia 2)
  for (const o of ordenes) o.forEach((t, i) => {
    for (const [d, w] of [[1, 3], [2, 1]]) for (const u of [o[i - d], o[i + d]]) if (u) cerca.get(t.id).set(u.id, Math.max(cerca.get(t.id).get(u.id) ?? 0, w));
  });
  const porId = new Map(taps.map(t => [t.id, t])), uso = new Map();
  // vecinos en el orden del archivo (mismo tema, sin ganchos): tampoco ahí se repite el personaje
  const archivo = new Map(taps.map(t => [t.id, []]));
  for (const theme of new Set(taps.map(t => t.theme))) {
    const lista = taps.filter(t => t.theme === theme && !t.hook);
    lista.forEach((t, i) => archivo.set(t.id, [lista[i - 1], lista[i + 1]].filter(Boolean)));
  }
  const usar = (k, v) => uso.set(k + '|' + v, (uso.get(k + '|' + v) ?? 0) + 1);
  /** Elige para `campo` la opción con menos choques con los vecinos ya asignados (mismo valor y mismo tema pesan más). */
  const elegir = (t, campo, opciones, extra = () => 0) => {
    let mejor = null, coste = Infinity;
    for (const v of opciones) {
      let c = (uso.get(campo + '|' + v) ?? 0) * 0.35 + extra(v) + (hashAvalancha(t.id + campo + v) % 1000) / 1e5;
      for (const [id, w] of cerca.get(t.id)) {
        const u = porId.get(id); if (!u.scene.__cine || u.scene[campo] === undefined) continue;
        if (u.scene[campo] === v && v !== null) c += w * (u.theme === t.theme ? 4 : 1.5);
      }
      if (c < coste) { coste = c; mejor = v; }
    }
    usar(campo, mejor);
    return mejor;
  };
  for (const t of ordenes[0]) {
    const tema = temas[t.theme], cine = tema.cine, s = t.scene, entradas = ENTRADAS[t.theme], personajes = TEMAS[Object.keys(TEMAS).find(k => TEMAS[k].topic === t.topic)].personajes;
    if (t.hook) {
      Object.assign(s, CINE_GANCHO[t.topic] ?? { camara: 'orbita', transicion: 'fundido' });
      if (!cine?.horasMundos?.includes(s.world)) delete s.hora;
    } else {
      // temas con registro (aventura): el fondo ya lo eligió el registro; el personaje se reparte aquí con los vecinos del
      // feed (desde la ronda de formatos, 102 Taps: el orden del archivo solo ya no bastaba para no repetirlo seguido)
      s.host = elegir(t, 'host', personajes ?? tema.registro?.personajes ?? [s.host], v => archivo.get(t.id).some(u => u.scene.__cine && u.scene.host === v) * 6);
      s.shot = elegir(t, 'shot', ENCUADRES);
      s.enter = elegir(t, 'enter', entradas);
      s.camara = elegir(t, 'camara', PLANOS, v => (s.shot === 'lejos' && (v === 'general' || v === 'cenital') ? 3 : 0));
      // un Tap «de noche» (sobrevivir la noche) se ve de noche si su lugar lo admite
      if (cine?.horasMundos?.includes(s.world)) s.hora = elegir(t, 'hora', HORAS, v => (/noche/.test(t.id) ? (v === 'noche' ? -3 : 1) : 0)); else delete s.hora;
      const climas = Object.entries(cine?.climas ?? {}).filter(([k, mundos]) => mundos.includes(s.world)
        && !(k === 'luciernagas' && !/noche/.test(s.world) && !['noche', 'tarde'].includes(s.hora))
        && !(k === 'polen' && s.hora === 'noche')).map(([k]) => k);
      const clima = elegir(t, 'clima', [null, ...climas], v => (v === null ? 0.5 : 0));
      if (clima) s.clima = clima; else delete s.clima;
      const fauna = Object.entries(cine?.fauna ?? {}).filter(([k, mundos]) => mundos.includes(s.world) && !(s.props && ['gato', 'peces'].includes(k))).map(([k]) => k);
      const f = elegir(t, 'fauna', [null, ...fauna], v => (v === null ? 0.6 : 0));
      if (f) s.fauna = f; else delete s.fauna;
      s.transicion = elegir(t, 'transicion', TRANSICIONES);
    }
    s.__cine = true;
  }
  for (const t of taps) delete t.scene.__cine;
  return taps;
}

export function leerBancos(carpeta = RUTAS.banco) {
  return Object.fromEntries(Object.entries(TEMAS).map(([clave, t]) => {
    const ruta = join(carpeta, t.archivo);
    if (!existsSync(ruta)) throw new Error(`Falta ${t.archivo} en ${carpeta}`);
    try { return [clave, JSON.parse(readFileSync(ruta, 'utf8'))]; }
    catch (e) { throw new Error(`${t.archivo}: JSON inválido (${e.message})`); }
  }));
}

/**
 * Valida una pregunta (ya resuelta) con los límites de Taps. Devuelve la lista de problemas.
 * `donde` es el texto que identifica la pregunta en los mensajes.
 */
export function validarPregunta(p, donde) {
  const e = [];
  const mal = m => e.push(`${donde}: ${m}`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.id ?? '')) mal('el id no está en kebab-case');
  if (typeof p.q !== 'string' || !p.q.trim()) mal('falta el enunciado');
  else if (p.q.length > LIMITES.pregunta) mal(`el enunciado tiene ${p.q.length} caracteres (máximo ${LIMITES.pregunta})`);
  if (p.tipo !== undefined && !TIPOS.includes(p.tipo)) mal(`tipo «${p.tipo}» desconocido (${TIPOS.join(', ')})`);
  const dos = p.tipo === 'duo' || p.tipo === 'vf', cuantas = dos ? LIMITES.opcionesDuo : LIMITES.opciones;
  if (!Array.isArray(p.options) || p.options.length !== cuantas) mal(`debe tener exactamente ${cuantas} opciones${dos ? ` (formato ${p.tipo})` : ''}`);
  else if (p.tipo === 'vf' && (p.options[0] !== OPCIONES_VF[0] || p.options[1] !== OPCIONES_VF[1])) mal(`verdadero/falso lleva las opciones ${JSON.stringify(OPCIONES_VF)}`);
  else {
    p.options.forEach(o => {
      if (typeof o !== 'string' || !o.trim()) mal('una opción está vacía');
      else if (o.length > LIMITES.opcion) mal(`la opción «${o}» tiene ${o.length} caracteres (máximo ${LIMITES.opcion})`);
    });
    if (new Set(p.options.map(o => String(o).toLowerCase())).size !== p.options.length) mal('tiene opciones repetidas');
  }
  if (!Number.isInteger(p.answer) || p.answer < 0 || p.answer >= (p.options?.length ?? 0)) mal(`answer (${p.answer}) no es el índice de una opción`);
  if (typeof p.why !== 'string' || !p.why.trim()) mal('falta la explicación');
  else if (p.why.length > LIMITES.explicacion) mal(`la explicación tiene ${p.why.length} caracteres (máximo ${LIMITES.explicacion})`);
  return e;
}

function validarResultados(resultados, donde) {
  const e = [];
  if (!Array.isArray(resultados) || resultados.length < 3 || resultados.length > 5) return [`${donde}: debe tener de 3 a 5 títulos de resultado`];
  if (resultados[0].min !== 0) e.push(`${donde}: el primer título debe empezar en 0 aciertos (nunca un título negativo)`);
  resultados.forEach((r, i) => {
    if (!r.title || !r.line) e.push(`${donde}: el título ${i + 1} no tiene title o line`);
    if (r.line && r.line.length > LIMITES.linea) e.push(`${donde}: la línea de «${r.title}» pasa de ${LIMITES.linea} caracteres`);
    if (r.lineas !== undefined) {
      if (!Array.isArray(r.lineas) || r.lineas.length > LIMITES.lineasExtra) e.push(`${donde}: «lineas» de «${r.title}» debe ser una lista de hasta ${LIMITES.lineasExtra} variantes`);
      else r.lineas.forEach(l => {
        if (typeof l !== 'string' || !l.trim()) e.push(`${donde}: «${r.title}» tiene una variante de línea vacía`);
        else if (l.length > LIMITES.linea) e.push(`${donde}: una variante de «${r.title}» pasa de ${LIMITES.linea} caracteres`);
        else if (l === r.line) e.push(`${donde}: una variante de «${r.title}» repite su línea`);
      });
    }
    if (i && !(r.min > resultados[i - 1].min)) e.push(`${donde}: los min de los títulos deben subir`);
    if (r.min > LIMITES.preguntasPorTap) e.push(`${donde}: un título pide ${r.min} aciertos y el Tap tiene ${LIMITES.preguntasPorTap} preguntas`);
  });
  return e;
}

/**
 * Escoge la escena de un Tap: mundo, personaje, objeto, encuadre, entrada y decorado. `n` = lugar del Tap dentro de su
 * subtema; `orden` = dentro de su tema; `id` = id del Tap (si está en LUGARES manda su lugar).
 */
/**
 * Temas con registro: fondos que encajan con un subtema (el n-ésimo Tap del subtema usa el n-ésimo, dando la vuelta). Los
 * subtemas sin entrada (o si el elegido repite el fondo del Tap anterior) usan la rotación de elegirParaTap.
 */
export const FONDOS_SUBTEMA = {
  espacio: ['noche-estrellada', 'piramides-noche'],
  animales: ['bosque', 'arboleda', 'nevado', 'cielo-nublado'],
  geografia: ['desierto', 'nevado', 'castillo', 'colinas-atardecer'],
  'ciencia-cotidiana': ['cielo-nublado', 'atardecer'],
  dinosaurios: ['desierto', 'arboleda', 'colinas-atardecer'],
  plantas: ['arboleda', 'bosque', 'atardecer'],
};

export function asignarEscena(clave, subtema, n, orden, esGancho, id, fondoPrevio = null) {
  const entradas = ENTRADAS[TEMAS[clave].theme];
  const reg = registroDe(TEMAS[clave].theme);
  if (reg) {
    if (esGancho) return { world: reg.fondos[0], host: reg.personajes[0], shot: 'centro', enter: 'saluda' };
    const k = orden + DESFASE[clave];
    const elegido = elegirParaTap(orden, reg.personajes, reg.fondos), host = elegido.host;
    const propios = (FONDOS_SUBTEMA[subtema] ?? []).filter(f => reg.fondos.includes(f));
    const candidatos = propios.length ? [propios[n % propios.length], ...propios] : [];
    const world = candidatos.find(f => f !== fondoPrevio) ?? (elegido.world !== fondoPrevio ? elegido.world : reg.fondos.find(f => f !== fondoPrevio));
    return { world, host, shot: ENCUADRES[k % ENCUADRES.length], enter: entradas[(k * 3 + 1) % entradas.length] };
  }
  if (esGancho) return { ...ESCENA_GANCHO[clave], shot: 'centro', enter: 'saluda' };
  const reglas = ESCENAS[clave];
  const lista = reglas[subtema] ?? reglas._;
  const [world, item, props] = LUGARES[id] ?? [...lista[n % lista.length], null];
  const personajes = TEMAS[clave].personajes;
  const k = orden + DESFASE[clave];
  return {
    world, host: personajes[orden % personajes.length], item,
    shot: ENCUADRES[k % ENCUADRES.length], enter: entradas[(k * 3 + 1) % entradas.length],
    ...(props ? { props } : {}),
  };
}

/** Revisa el objeto para explicar de una pregunta contra el catálogo del tema (theme.json → visuals.objects). */
function validarVisual(v, catalogo, donde) {
  if (v === undefined) return [];
  if (!v || typeof v !== 'object' || typeof v.objeto !== 'string' || typeof v.accion !== 'string') return [`${donde}: «visual» debe ser { objeto, accion, valor? }`];
  const acciones = catalogo?.[v.objeto];
  if (!acciones) return [`${donde}: el objeto «${v.objeto}» no existe en el tema (${Object.keys(catalogo ?? {}).join(', ') || 'sin objetos'})`];
  if (!acciones.includes(v.accion)) return [`${donde}: el objeto «${v.objeto}» no tiene la acción «${v.accion}» (${acciones.join(', ')})`];
  if (v.valor !== undefined && typeof v.valor !== 'string') return [`${donde}: «valor» del objeto debe ser texto`];
  return [];
}

/**
 * Convierte los bancos en Taps. Devuelve `{ taps, retirados, errores, avisos }`; si `errores` no está vacío no se debe
 * escribir nada. `retos` = salida de leerRetos; `temas` = salida de leerTemas.
 */
export function generar(bancos, retos, temas) {
  const errores = [], avisos = [], taps = [], retirados = [];
  const idsPregunta = new Map(), idsTap = new Map();
  for (const [clave, def] of Object.entries(TEMAS)) {
    const banco = bancos[clave];
    const archivo = def.archivo;
    const err = m => errores.push(`${archivo}: ${m}`);
    if (!banco || !Array.isArray(banco.preguntas) || !Array.isArray(banco.taps)) { err('debe tener «preguntas» y «taps»'); continue; }
    const errTit = validarResultados(banco.titulosResultado, `${archivo} · titulosResultado`);
    errores.push(...errTit);
    // Títulos por subtema: el mismo formato que «titulosResultado», uno por subtema (los que falten usan los del tema).
    const titulosSubtema = banco.titulosPorSubtema ?? {};
    if (typeof titulosSubtema !== 'object' || Array.isArray(titulosSubtema)) err('«titulosPorSubtema» debe ser un objeto { "<subtema>": [títulos] }');
    else for (const [sub, lista] of Object.entries(titulosSubtema)) {
      errores.push(...validarResultados(lista, `${archivo} · titulosPorSubtema.${sub}`));
      if (!banco.taps.some(t => (t.subtema ?? 'mixto') === sub)) avisos.push(`${archivo}: ningún Tap usa «titulosPorSubtema.${sub}»`);
    }

    // Preguntas: las del banco y las que reutiliza de retos.data.ts (se resuelven por id).
    const porId = new Map();
    for (const p of banco.preguntas) {
      if (idsPregunta.has(p.id)) err(`pregunta «${p.id}»: el id ya existe en ${idsPregunta.get(p.id)}`);
      idsPregunta.set(p.id, archivo);
      porId.set(p.id, { ...p, origen: archivo });
    }
    for (const x of banco.existentes ?? []) {
      const original = retos[x.origen]?.get(x.id);
      if (!original) { err(`«existentes»: «${x.id}» no está en ${x.origen} de retos.data.ts`); continue; }
      if (idsPregunta.has(x.id)) err(`pregunta «${x.id}»: el id ya existe en ${idsPregunta.get(x.id)}`);
      idsPregunta.set(x.id, archivo);
      porId.set(x.id, { ...original, ...x, origen: x.origen });
    }

    let orden = 0, fondoPrevio = null;
    const porSubtema = new Map();
    for (const t of banco.taps) {
      const donde = `${archivo} · Tap «${t.id}»`;
      if (idsTap.has(t.id)) err(`Tap «${t.id}»: id repetido (también en ${idsTap.get(t.id)})`);
      idsTap.set(t.id, archivo);
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(t.id ?? '')) err(`Tap «${t.id}»: el id no está en kebab-case`);
      if (!t.id?.startsWith(def.prefijo)) avisos.push(`${donde}: el id debería empezar con «${def.prefijo}»`);
      if (!t.titulo?.trim()) err(`Tap «${t.id}»: falta el título`);
      if (!Array.isArray(t.preguntas) || t.preguntas.length !== LIMITES.preguntasPorTap) {
        err(`Tap «${t.id}»: tiene ${t.preguntas?.length ?? 0} preguntas (deben ser ${LIMITES.preguntasPorTap})`);
        continue;
      }
      if (new Set(t.preguntas).size !== t.preguntas.length) err(`Tap «${t.id}»: repite una pregunta`);
      if (t.retirado === true || t.estado === 'retirado') { retirados.push(t.id); continue; }

      const preguntas = [];
      for (const id of t.preguntas) {
        const p = porId.get(id);
        if (!p) { err(`Tap «${t.id}»: no existe la pregunta «${id}»`); continue; }
        if (['retirada', 'retirado'].includes(p.estado)) err(`Tap «${t.id}»: la pregunta «${id}» está retirada; cámbiala o retira el Tap (retirado: true)`);
        if (p.estado === 'borrador') err(`Tap «${t.id}»: la pregunta «${id}» sigue en borrador; revísala (estado «revisada») antes de publicarla`);
        errores.push(...validarPregunta(p, `${archivo} · pregunta «${id}»`).map(m => m));
        errores.push(...validarVisual(p.visual, temas[def.theme]?.objetos, `${archivo} · pregunta «${id}»`));
        errores.push(...validarEscena(p.escena, p, temas[def.theme]?.escenas, `${archivo} · pregunta «${id}»`));
        preguntas.push({
          id: p.id, q: p.q, options: p.options, answer: p.answer, why: p.why, ...(p.tipo && p.tipo !== 'clasica' ? { tipo: p.tipo } : {}),
          ...(p.visual ? { visual: p.visual } : {}), ...(p.escena ? { escena: p.escena } : {}),
        });
      }
      if (t.gancho && !(banco.taps[0] === t)) err(`Tap «${t.id}»: el Tap de gancho debe ser el primero del archivo`);
      if (banco.taps[0] === t && !t.gancho) err(`Tap «${t.id}»: el primer Tap del tema debe ser el de gancho (gancho: true)`);

      const subtema = t.subtema ?? 'mixto';
      const n = porSubtema.get(subtema) ?? 0;
      porSubtema.set(subtema, n + 1);
      const escena = asignarEscena(clave, subtema, n, orden, t.gancho === true, t.id, fondoPrevio);
      fondoPrevio = escena.world;
      orden++;
      const tema = temas[def.theme];
      if (escena.item !== undefined && !OBJETOS[def.theme].includes(escena.item)) err(`Tap «${t.id}»: el objeto «${escena.item}» no existe en el tema ${def.theme}`);
      if (!tema.mundos[escena.world]) err(`Tap «${t.id}»: el mundo «${escena.world}» no existe en el tema ${def.theme}`);
      if (!tema.personajes.has(escena.host)) err(`Tap «${t.id}»: el personaje «${escena.host}» no existe en el tema ${def.theme}`);
      if (escena.shot && !tema.encuadres.has(escena.shot)) err(`Tap «${t.id}»: el encuadre «${escena.shot}» no existe en el tema ${def.theme}`);
      if (escena.enter && !tema.entradas.has(escena.enter)) err(`Tap «${t.id}»: la entrada «${escena.enter}» no existe en el tema ${def.theme}`);
      if (escena.props && !tema.decorados.has(escena.props)) err(`Tap «${t.id}»: el decorado «${escena.props}» no existe en el tema ${def.theme}`);
      const resultados = t.resultados ?? (Array.isArray(titulosSubtema) ? undefined : titulosSubtema[subtema]) ?? banco.titulosResultado;
      if (t.resultados) errores.push(...validarResultados(t.resultados, `${donde} · resultados`));

      taps.push({
        id: t.id,
        theme: def.theme,
        title: t.titulo,
        kicker: def.kicker,
        scene: escena,
        backdrop: tema.mundos[escena.world]?.sky ?? ['#0b0d12', '#1a1f2e'],
        ground: tema.mundos[escena.world]?.ground ?? '#1a1f2e',
        questions: preguntas,
        results: resultados.map(r => ({ min: r.min, title: r.title, line: r.line, ...(r.lineas?.length ? { lines: [r.line, ...r.lineas] } : {}) })),
        topic: def.topic,
        ...(t.gancho ? { hook: true } : {}),
        ...(t.nivel ? { level: t.nivel } : {}),
        ...(t.subtema ? { subtopic: t.subtema } : {}),
      });
    }
    if (banco.taps.length && !banco.taps.some(t => t.gancho)) err('ningún Tap es de gancho');
  }
  for (const t of taps) {
    if (!['facil', 'media', 'dificil'].includes(t.level ?? 'media')) errores.push(`Tap «${t.id}»: nivel «${t.level}» no válido (facil, media o dificil)`);
  }
  if (!errores.length) {
    asignarCine(taps, temas);
    for (const t of taps) {
      const s = t.scene, cine = temas[t.theme]?.cine, mal = m => errores.push(`Tap «${t.id}»: ${m} (tema ${t.theme})`);
      if (!temas[t.theme].personajes.has(s.host)) mal(`el personaje «${s.host}» no existe`);
      if (s.camara && !cine?.planos?.[s.camara]) mal(`el plano «${s.camara}» no existe en cine.planos`);
      if (s.hora && !(cine?.horas?.[s.hora] && cine.horasMundos?.includes(s.world))) mal(`la hora «${s.hora}» no aplica en «${s.world}»`);
      if (s.clima && !cine?.climas?.[s.clima]?.includes(s.world)) mal(`el clima «${s.clima}» no aplica en «${s.world}»`);
      if (s.fauna && !cine?.fauna?.[s.fauna]?.includes(s.world)) mal(`la fauna «${s.fauna}» no aplica en «${s.world}»`);
      if (s.transicion && !cine?.transiciones?.includes(s.transicion)) mal(`la transición «${s.transicion}» no existe`);
    }
  }
  return { taps, retirados, errores: [...new Set(errores)], avisos };
}

/** Texto del archivo TypeScript generado (estable: el mismo banco da siempre los mismos bytes). */
export function emitir({ taps, retirados, calendario = null }) {
  const lit = v => JSON.stringify(v);
  const lineas = taps.map(t => `  ${lit(t)},`);
  return `// ARCHIVO GENERADO por scripts/generar-taps.mjs a partir de taps/banco/*.json. No lo edites a mano:
// cambia el banco y corre \`npm run taps:generar\`.
import { ITap } from './taps.types';

export const TAPS_BANCO: ITap[] = [
${lineas.join('\n')}
];

/** Taps marcados como retirados en el banco: no se publican, pero sus enlaces avisan «este Tap se retiró». */
export const TAPS_RETIRADOS: string[] = ${lit(retirados)};
${calendario ? `
/** Reto del día: un Tap por día desde ${calendario.inicio} (#1). Fijo y versionado en scripts/reto-calendario.json. */
export const TAPS_RETO_CALENDARIO: { inicio: string; dias: string[] } = ${lit(calendario)};
` : ''}`;
}

/** Lee todo, valida y devuelve el resultado (sin escribir). */
/**
 * Índice del registro (public/taps-engine/registro.json): todos los personajes/<id>/personaje.json y fondos/<id>/fondo.json
 * en un solo archivo, ordenados por id. Se valida cada manifiesto (uno roto es un error).
 */
export function emitirRegistro(motor = join(RUTAS.temas, '..')) {
  const leer = (sub, archivo, validar) => {
    const dir = join(motor, sub), out = {};
    for (const id of readdirSync(dir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort()) {
      const ruta = join(dir, id, archivo);
      if (!existsSync(ruta)) continue;
      const m = JSON.parse(readFileSync(ruta, 'utf8')), e = validar(m, id);
      if (e.length) throw new Error(`registro: ${sub}/${id}: ${e.join('; ')}`);
      out[id] = m;
    }
    return out;
  };
  const indice = { personajes: leer('personajes', 'personaje.json', validarPersonaje), fondos: leer('fondos', 'fondo.json', validarFondo) };
  return '{\n  "nota": "ARCHIVO GENERADO por npm run taps:generar a partir de personajes/*/personaje.json y fondos/*/fondo.json. No lo edites a mano.",\n'
    + `  "personajes": ${JSON.stringify(indice.personajes)},\n  "fondos": ${JSON.stringify(indice.fondos)}\n}\n`;
}

export function construir(rutas = RUTAS) {
  const resultado = generar(leerBancos(rutas.banco), leerRetos(rutas.retos), leerTemas(rutas.temas));
  if (resultado.errores.length) return { ...resultado, calendario: null, texto: '', textoCalendario: '' };
  const calendario = calendarioReto(resultado.taps, rutas.calendario ? leerCalendario(rutas.calendario) : null);
  return { ...resultado, calendario, texto: emitir({ ...resultado, calendario }), textoCalendario: emitirCalendario(calendario), textoRegistro: emitirRegistro(join(rutas.temas, '..')) };
}

function main() {
  const comprobar = process.argv.includes('--check');
  let r;
  try { r = construir(); } catch (e) { console.error(`taps:generar: ${e.message}`); process.exit(1); }
  for (const a of r.avisos) console.warn(`Aviso: ${a}`);
  if (r.errores.length) {
    console.error(`taps:generar: ${r.errores.length} problema(s) en el banco, no se generó nada:\n- ${r.errores.join('\n- ')}`);
    process.exit(1);
  }
  const actual = existsSync(RUTAS.salida) ? readFileSync(RUTAS.salida, 'utf8') : '';
  if (comprobar) {
    // Con autocrlf (Windows) el archivo puede traer CRLF: se compara sin saltos de Windows.
    const cal = existsSync(RUTAS.calendario) ? readFileSync(RUTAS.calendario, 'utf8').split('\r\n').join('\n') : '';
    const reg = existsSync(RUTAS.registro) ? readFileSync(RUTAS.registro, 'utf8').split('\r\n').join('\n') : '';
    if (reg !== r.textoRegistro) { console.error('taps:generar --check: taps-engine/registro.json está desactualizado. Corre `npm run taps:generar` y súbelo.'); process.exit(1); }
    if (cal !== r.textoCalendario) { console.error('taps:generar --check: reto-calendario.json está desactualizado. Corre `npm run taps:generar` y súbelo.'); process.exit(1); }
    if (actual.split('\r\n').join('\n') !== r.texto) { console.error('taps:generar --check: taps.banco.generated.ts está desactualizado. Corre `npm run taps:generar` y súbelo.'); process.exit(1); }
    console.log(`taps:generar --check: al día (${r.taps.length} Taps).`);
    return;
  }
  mkdirSync(dirname(RUTAS.salida), { recursive: true });
  writeFileSync(RUTAS.salida, r.texto, 'utf8');
  writeFileSync(RUTAS.calendario, r.textoCalendario, 'utf8');
  writeFileSync(RUTAS.registro, r.textoRegistro, 'utf8');
  const preguntas = r.taps.reduce((n, t) => n + t.questions.length, 0);
  console.log(`taps:generar: ${r.taps.length} Taps, ${preguntas} preguntas${r.retirados.length ? `, ${r.retirados.length} retirados` : ''} → ${RUTAS.salida}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
