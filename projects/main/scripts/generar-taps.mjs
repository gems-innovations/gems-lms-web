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
//   "resultados": [..] → títulos propios (si no, usa "titulosResultado" del tema).
//
// Asignación de escena (tema visual, personaje, mundo, objeto en la mano, encuadre, entrada y decorado): reglas fijas y
// deterministas, sin azar. Cada Tap publicado tiene su lugar en LUGARES; uno nuevo usa la lista de (mundo, objeto) de su
// subtema (el n-ésimo Tap de ese subtema usa el n-ésimo par, dando la vuelta). Personaje, encuadre y entrada rotan por el
// orden del Tap dentro de su tema. El Tap de gancho usa siempre la escena de ESCENA_GANCHO, centrado y saludando.
// Una pregunta puede traer "visual": { objeto, accion, valor? } (objeto para explicar tras responder; catálogo en el
// theme.json de su tema → visuals.objects). El generador lo copia tal cual y falla si el objeto o la acción no existen.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const APP = join(AQUI, '../src/app');
export const RUTAS = {
  banco: join(APP, 'taps/banco'),
  retos: join(APP, 'public/retos.data.ts'),
  temas: join(AQUI, '../public/taps-engine/themes'),
  salida: join(APP, 'taps/taps.banco.generated.ts'),
};

/** Mismos límites que `validar.mjs` del banco (y que los de la interfaz: la pregunta cabe en 5 líneas). */
export const LIMITES = { pregunta: 120, opcion: 22, explicacion: 90, opciones: 4, preguntasPorTap: 5 };

/** Archivo del banco → tema del motor, categoría del selector (`?tema=`) y rótulo. */
export const TEMAS = {
  minecraft: { archivo: 'minecraft.json', theme: 'minecraft', topic: 'minecraft', kicker: 'Quiz de bloques', prefijo: 'mc-', personajes: ['leo', 'sofi', 'mateo', 'dani'] },
  logica: { archivo: 'logica.json', theme: 'estudio', topic: 'logica', kicker: 'Lógica y trampas', prefijo: 'lg-', personajes: ['chispa', 'nube'] },
  cultura: { archivo: 'cultura.json', theme: 'estudio', topic: 'cultura', kicker: 'Cultura general', prefijo: 'cu-', personajes: ['nube', 'chispa'] },
};

/** Objetos que cada tema dibuja en la mano (renderer3d.js ITEMS / rig.js ITEMS). */
export const OBJETOS = {
  minecraft: ['sword', 'pick', 'axe', 'torch', 'diamond', 'apple', 'grass', 'tnt'],
  estudio: ['matraz', 'lupa', 'libro'],
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
  'mc-secretos': ['nieve', 'diamond', null], 'mc-nether-1': ['nether', 'sword', 'portal'], 'mc-mundo': ['bosque', 'sword', 'corral'],
  'mc-crafteo-2': ['aldea', 'pick', 'taller'], 'mc-monstruos': ['noche', 'torch', 'campamento'], 'mc-redstone-1': ['cueva', 'pick', 'circuito'],
  'mc-end': ['end', 'diamond', null], 'mc-redstone-3': ['cueva', 'torch', 'circuito'], 'mc-encantamientos': ['casa', 'diamond', 'biblioteca'],
  'mc-mineria': ['cueva', 'pick', 'mina'], 'mc-nether-3': ['nether', 'diamond', 'portal'], 'mc-rayos': ['desierto', 'sword', null],
  'mc-noche-1': ['noche', 'torch', 'campamento'], 'mc-nuevos': ['playa', 'apple', null], 'mc-redstone-2': ['noche', 'pick', 'circuito'],
  'mc-leyendas': ['desierto', 'pick', null], 'mc-noche-2': ['nieve', 'axe', 'campamento'], 'mc-mezcla': ['bosque', 'axe', null],
  'mc-taller': ['casa', 'axe', 'taller'],
  'lg-adivinanzas-1': ['cocina', 'libro', 'reloj'], 'lg-zorgs': ['espacio', 'lupa', null], 'lg-lee-bien-2': ['biblioteca', 'lupa', null],
  'lg-calendario': ['aula', 'libro', 'reloj'], 'lg-azar': ['jardin', 'lupa', 'planta'], 'lg-series-1': ['laboratorio', 'lupa', null],
  'lg-lateral': ['observatorio', 'lupa', null], 'lg-series-2': ['aula', 'libro', 'reloj'], 'lg-lluvia': ['jardin', 'libro', 'planta'],
  'lg-adivinanzas-2': ['biblioteca', 'libro', 'reloj'], 'lg-rapidas': ['cocina', 'lupa', null], 'lg-adivinanzas-3': ['biblioteca', 'libro', 'globo'],
  'lg-mezcla': ['museo', 'lupa', null],
  'cu-cuerpo-1': ['laboratorio', 'lupa', null], 'cu-espacio-1': ['observatorio', 'lupa', null], 'cu-datos': ['biblioteca', 'libro', 'globo'],
  'cu-animales-1': ['jardin', 'lupa', null], 'cu-ciencia-1': ['cocina', 'matraz', null], 'cu-geografia-2': ['museo', 'libro', null],
  'cu-cuerpo-2': ['laboratorio', 'matraz', 'libros'], 'cu-geografia-1': ['museo', 'lupa', 'globo'], 'cu-mitos': ['biblioteca', 'lupa', null],
  'cu-animales-2': ['jardin', 'libro', 'planta'], 'cu-espacio-2': ['espacio', 'lupa', null], 'cu-gigantes': ['observatorio', 'libro', 'globo'],
  'cu-animales-3': ['aula', 'libro', 'planta'], 'cu-luz-sonido': ['cocina', 'matraz', null], 'cu-rarezas': ['laboratorio', 'lupa', 'planta'],
};

/**
 * Encuadre y entrada del personaje (claves de `shots` y `enters` del theme.json). Rotan por el orden del Tap dentro de su
 * tema (con un desfase por categoría) para que al deslizar el personaje no quede siempre en el mismo sitio ni entre igual.
 * El Tap de gancho va centrado y saluda. Todo es determinista: el servidor y el navegador ven la misma escena.
 */
export const ENCUADRES = ['izquierda', 'derecha', 'cerca-izquierda', 'lejos', 'cerca-derecha', 'centro'];
export const ENTRADAS = { minecraft: ['camina', 'salta', 'gira', 'saluda'], estudio: ['vuela', 'cae', 'aparece', 'saluda'] };
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
    _: [['bosque', 'axe'], ['noche', 'torch'], ['pradera', 'apple'], ['desierto', 'pick'], ['nieve', 'sword']],
  },
  logica: {
    adivinanzas: [['aula', 'libro'], ['laboratorio', 'libro']],
    silogismos: [['aula', 'lupa'], ['aula', 'libro']],
    series: [['laboratorio', 'lupa'], ['espacio', 'lupa']],
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

/** Mundos, personajes, encuadres, entradas, decorados y objetos para explicar de cada tema del motor (y los colores de carga). */
export function leerTemas(carpeta = RUTAS.temas) {
  const salida = {};
  for (const id of Object.keys(OBJETOS)) {
    const t = JSON.parse(readFileSync(join(carpeta, id, 'theme.json'), 'utf8'));
    salida[id] = {
      mundos: t.scenes, personajes: new Set(Object.keys(t.characters)), encuadres: new Set(Object.keys(t.shots ?? {})),
      entradas: new Set(t.enters ?? []), decorados: new Set(Object.keys(t.props ?? {})), objetos: t.visuals?.objects ?? {},
    };
  }
  return salida;
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
  if (!Array.isArray(p.options) || p.options.length !== LIMITES.opciones) mal(`debe tener exactamente ${LIMITES.opciones} opciones`);
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
    if (i && !(r.min > resultados[i - 1].min)) e.push(`${donde}: los min de los títulos deben subir`);
    if (r.min > LIMITES.preguntasPorTap) e.push(`${donde}: un título pide ${r.min} aciertos y el Tap tiene ${LIMITES.preguntasPorTap} preguntas`);
  });
  return e;
}

/**
 * Escoge la escena de un Tap: mundo, personaje, objeto, encuadre, entrada y decorado. `n` = lugar del Tap dentro de su
 * subtema; `orden` = dentro de su tema; `id` = id del Tap (si está en LUGARES manda su lugar).
 */
export function asignarEscena(clave, subtema, n, orden, esGancho, id) {
  const entradas = ENTRADAS[TEMAS[clave].theme];
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

    let orden = 0;
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
        preguntas.push({ id: p.id, q: p.q, options: p.options, answer: p.answer, why: p.why, ...(p.visual ? { visual: p.visual } : {}) });
      }
      if (t.gancho && !(banco.taps[0] === t)) err(`Tap «${t.id}»: el Tap de gancho debe ser el primero del archivo`);
      if (banco.taps[0] === t && !t.gancho) err(`Tap «${t.id}»: el primer Tap del tema debe ser el de gancho (gancho: true)`);

      const subtema = t.subtema ?? 'mixto';
      const n = porSubtema.get(subtema) ?? 0;
      porSubtema.set(subtema, n + 1);
      const escena = asignarEscena(clave, subtema, n, orden, t.gancho === true, t.id);
      orden++;
      const tema = temas[def.theme];
      if (!OBJETOS[def.theme].includes(escena.item)) err(`Tap «${t.id}»: el objeto «${escena.item}» no existe en el tema ${def.theme}`);
      if (!tema.mundos[escena.world]) err(`Tap «${t.id}»: el mundo «${escena.world}» no existe en el tema ${def.theme}`);
      if (!tema.personajes.has(escena.host)) err(`Tap «${t.id}»: el personaje «${escena.host}» no existe en el tema ${def.theme}`);
      if (escena.shot && !tema.encuadres.has(escena.shot)) err(`Tap «${t.id}»: el encuadre «${escena.shot}» no existe en el tema ${def.theme}`);
      if (escena.enter && !tema.entradas.has(escena.enter)) err(`Tap «${t.id}»: la entrada «${escena.enter}» no existe en el tema ${def.theme}`);
      if (escena.props && !tema.decorados.has(escena.props)) err(`Tap «${t.id}»: el decorado «${escena.props}» no existe en el tema ${def.theme}`);
      const resultados = t.resultados ?? banco.titulosResultado;
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
        results: resultados.map(r => ({ min: r.min, title: r.title, line: r.line })),
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
  return { taps, retirados, errores: [...new Set(errores)], avisos };
}

/** Texto del archivo TypeScript generado (estable: el mismo banco da siempre los mismos bytes). */
export function emitir({ taps, retirados }) {
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
`;
}

/** Lee todo, valida y devuelve el resultado (sin escribir). */
export function construir(rutas = RUTAS) {
  const resultado = generar(leerBancos(rutas.banco), leerRetos(rutas.retos), leerTemas(rutas.temas));
  return { ...resultado, texto: resultado.errores.length ? '' : emitir(resultado) };
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
    if (actual.split('\r\n').join('\n') !== r.texto) { console.error('taps:generar --check: taps.banco.generated.ts está desactualizado. Corre `npm run taps:generar` y súbelo.'); process.exit(1); }
    console.log(`taps:generar --check: al día (${r.taps.length} Taps).`);
    return;
  }
  mkdirSync(dirname(RUTAS.salida), { recursive: true });
  writeFileSync(RUTAS.salida, r.texto, 'utf8');
  const preguntas = r.taps.reduce((n, t) => n + t.questions.length, 0);
  console.log(`taps:generar: ${r.taps.length} Taps, ${preguntas} preguntas${r.retirados.length ? `, ${r.retirados.length} retirados` : ''} → ${RUTAS.salida}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
