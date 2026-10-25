// Tema «época» · tablas de afinidad y lógica pura del diseñador: paletas cerradas, qué sombrero, objeto y escenario van con
// cada prenda, «Sorpréndeme» curado (nunca un dado puro) y sugerencias de una línea para la persona que diseña.
// Sin DOM: lo usan disenador.html y las pruebas (taps-engine-tests/sugerencias.test.mjs). No toca rig.js ni scenery.js.

import { CATALOGO, ITEMS, lookOf } from './rig.js';
import { WORLD_NAMES } from './scenery.js';

/** Paletas cerradas (6 por campo) para las muestras del diseñador; la prenda tiene su propia paleta. */
export const PALETAS = Object.freeze({
  skin: ['#f1c9a5', '#d9ab86', '#c99a76', '#a8714a', '#8a5a3c', '#6b4429'],
  hair: ['#15110e', '#3a2a20', '#6a3a1a', '#b8863b', '#9a9a9a', '#8a2f1d'],
  coat: {
    levita: ['#34364c', '#1d1d27', '#4a2a2a', '#2c3a2c', '#5a4a3a', '#6a6a72'], safari: ['#b8a679', '#a38b57', '#8c7a4e', '#c9b58a', '#6e6a4a', '#9c8b6a'],
    bata: ['#f4f7fa', '#e9eef2', '#dfe7ee', '#cfe3ee', '#e8e1cf', '#c8d3dd'], toga: ['#efe6d0', '#e9e1cf', '#f4f0e4', '#d9c9a6', '#7a2a5a', '#3a74c4'],
    tunica: ['#efe6d0', '#e8d9b6', '#c8a24a', '#3a74c4', '#b84a3a', '#efe3c8'], medieval: ['#5a6a8a', '#7a2a2a', '#34564a', '#8c6a3a', '#4a3a2a', '#2c3a4c'],
    traje: ['#2c3a4c', '#1c2733', '#34364c', '#3a3a3a', '#4a3a2a', '#6a6a72'],
  },
  shirt: ['#e8e1cf', '#f4f7fa', '#3a74c4', '#c8453f', '#d3b27a', '#2a2a33'],
  vest: ['#7a5c3a', '#8a7a50', '#7a2a2a', '#34564a', '#2c3a4c', '#c8a24a'],
  trousers: ['#2c2c36', '#5a4a32', '#4a3a2a', '#2c3a4c', '#6a6a72', '#efe6d0'],
  shoes: ['#15151a', '#3a2a1a', '#6a4a2a', '#2a1c12', '#c8a24a', '#1d1d22'],
  accent: ['#c8a24a', '#7a2a5a', '#c8453f', '#3a74c4', '#34d399', '#e8e1cf'],
  hatColor: ['#15151a', '#a38b57', '#4f7a3a', '#7a2a2a', '#2c3a4c', '#d3b27a'],
});

/** Nombres para personas de cada pieza, objeto y escenario (con artículo para las frases). */
export const NOMBRES = Object.freeze({
  none: 'Sin nada', corto: 'Corto', recogido: 'Recogido', ondas: 'Ondas', largo: 'Largo', bob: 'Media melena', rizos: 'Rizos', calvo: 'Sin pelo',
  patillas: 'Patillas', bigote: 'Bigote', perilla: 'Perilla', barba: 'Barba', levita: 'Levita', safari: 'Safari', bata: 'Bata', toga: 'Toga', tunica: 'Túnica',
  medieval: 'Medieval', traje: 'Traje', larga: 'Larga', corta: 'Corta', copa: 'De copa', bicornio: 'Bicornio', laurel: 'Laurel', gorra: 'Gorra', boina: 'Boina',
  pluma: 'Pluma', cepillo: 'Cepillo', pergamino: 'Pergamino', libro: 'Libro', lupa: 'Lupa', matraz: 'Matraz', antorcha: 'Antorcha', mapa: 'Mapa',
});
export const MUNDOS = Object.freeze({
  'taller-londres': ['Taller de Londres', '1803'], 'excavacion-egipto': ['Excavación en Egipto', 'Valle de los Reyes'], 'foro-roma': ['Foro de Roma', 'Antigüedad'],
  'sala-medieval': ['Sala medieval', 'Castillo'], 'laboratorio-moderno': ['Laboratorio moderno', 'Hoy'],
});
const CON_ARTICULO = {
  levita: 'la levita', safari: 'el traje safari', bata: 'la bata', toga: 'la toga', tunica: 'la túnica', medieval: 'la túnica medieval', traje: 'el traje',
  copa: 'el sombrero de copa', bicornio: 'el bicornio', laurel: 'el laurel', gorra: 'la gorra', boina: 'la boina', hatSafari: 'el sombrero safari',
  pluma: 'la pluma', cepillo: 'el cepillo', pergamino: 'el pergamino', libro: 'el libro', lupa: 'la lupa', matraz: 'el matraz', antorcha: 'la antorcha', mapa: 'el mapa',
  'taller-londres': 'el Taller de Londres', 'excavacion-egipto': 'Egipto', 'foro-roma': 'el Foro de Roma', 'sala-medieval': 'la sala medieval', 'laboratorio-moderno': 'el laboratorio',
};
const art = k => CON_ARTICULO[k] ?? k;
const Art = k => { const t = art(k); return t[0].toUpperCase() + t.slice(1); };

/**
 * Afinidad por prenda: conjuntos de colores armonizados (cada uno es un atuendo completo), sombreros que le van (el primero
 * es el preferido; 'none' primero = se lleva sin sombrero), manga, objetos y escenarios donde luce.
 */
export const AFINIDAD = Object.freeze({
  levita: {
    sombreros: ['none', 'copa', 'bicornio', 'gorra'], manga: ['larga'], objetos: ['pluma', 'libro', 'mapa', 'pergamino'], mundos: ['taller-londres', 'sala-medieval'], gafas: 0.25,
    conjuntos: [
      { coat: '#34364c', shirt: '#e8e1cf', vest: '#7a5c3a', trousers: '#2c2c36', shoes: '#15151a', accent: '#c8a24a', hatColor: '#15151a' },
      { coat: '#1d1d27', shirt: '#f4f7fa', vest: '#7a2a2a', trousers: '#2c2c36', shoes: '#1d1d22', accent: '#c8453f', hatColor: '#1d1d22' },
      { coat: '#4a2a2a', shirt: '#e8e1cf', vest: '#c8a24a', trousers: '#2c3a4c', shoes: '#15151a', accent: '#c8a24a', hatColor: '#2c3a4c' },
      { coat: '#2c3a2c', shirt: '#e8e1cf', vest: '#8a7a50', trousers: '#4a3a2a', shoes: '#3a2a1a', accent: '#d3b27a', hatColor: '#15151a' },
    ],
  },
  safari: {
    sombreros: ['safari', 'none', 'gorra'], manga: ['larga', 'corta'], objetos: ['cepillo', 'mapa', 'lupa', 'antorcha'], mundos: ['excavacion-egipto'], gafas: 0.1,
    conjuntos: [
      { coat: '#b8a679', shirt: '#e8e1cf', vest: '#8a7a50', trousers: '#5a4a32', shoes: '#3a2a1a', accent: '#c8a24a', hatColor: '#a38b57' },
      { coat: '#a38b57', shirt: '#f4f7fa', vest: '#7a5c3a', trousers: '#4a3a2a', shoes: '#3a2a1a', accent: '#c8453f', hatColor: '#8c7a4e' },
      { coat: '#c9b58a', shirt: '#e8e1cf', vest: null, trousers: '#6e6a4a', shoes: '#6a4a2a', accent: '#34564a', hatColor: '#a38b57' },
      { coat: '#8c7a4e', shirt: '#e8e1cf', vest: '#34564a', trousers: '#5a4a32', shoes: '#2a1c12', accent: '#d3b27a', hatColor: '#6e6a4a' },
    ],
  },
  bata: {
    sombreros: ['none'], manga: ['larga'], objetos: ['lupa', 'matraz', 'libro'], mundos: ['laboratorio-moderno'], gafas: 0.5,
    conjuntos: [
      { coat: '#f4f7fa', shirt: '#3a74c4', vest: null, trousers: '#2c3a4c', shoes: '#1d1d22', accent: '#3a74c4', hatColor: '#2c3a4c' },
      { coat: '#e9eef2', shirt: '#c8453f', vest: null, trousers: '#2c2c36', shoes: '#15151a', accent: '#c8453f', hatColor: '#15151a' },
      { coat: '#dfe7ee', shirt: '#34d399', vest: null, trousers: '#2c3a4c', shoes: '#3a2a1a', accent: '#34d399', hatColor: '#2c3a4c' },
      { coat: '#e8e1cf', shirt: '#2a2a33', vest: null, trousers: '#6a6a72', shoes: '#1d1d22', accent: '#c8a24a', hatColor: '#6a6a72' },
    ],
  },
  toga: {
    sombreros: ['laurel', 'none'], manga: ['corta'], objetos: ['pergamino', 'libro'], mundos: ['foro-roma'], gafas: 0,
    conjuntos: [
      { coat: '#efe6d0', shirt: '#e8e1cf', vest: null, trousers: '#efe6d0', shoes: '#6a4a2a', accent: '#7a2a5a', hatColor: '#4f7a3a' },
      { coat: '#f4f0e4', shirt: '#e8e1cf', vest: null, trousers: '#efe6d0', shoes: '#3a2a1a', accent: '#c8453f', hatColor: '#4f7a3a' },
      { coat: '#e9e1cf', shirt: '#e8e1cf', vest: null, trousers: '#efe6d0', shoes: '#6a4a2a', accent: '#3a74c4', hatColor: '#c8a24a' },
      { coat: '#7a2a5a', shirt: '#e8e1cf', vest: null, trousers: '#efe6d0', shoes: '#3a2a1a', accent: '#c8a24a', hatColor: '#c8a24a' },
    ],
  },
  tunica: {
    sombreros: ['none', 'laurel'], manga: ['corta'], objetos: ['pergamino', 'antorcha', 'cepillo'], mundos: ['excavacion-egipto', 'foro-roma'], gafas: 0,
    conjuntos: [
      { coat: '#efe6d0', shirt: '#e8e1cf', vest: null, trousers: '#efe6d0', shoes: '#c8a24a', accent: '#c8a24a', hatColor: '#c8a24a' },
      { coat: '#e8d9b6', shirt: '#e8e1cf', vest: null, trousers: '#efe6d0', shoes: '#6a4a2a', accent: '#3a74c4', hatColor: '#4f7a3a' },
      { coat: '#3a74c4', shirt: '#e8e1cf', vest: null, trousers: '#efe6d0', shoes: '#c8a24a', accent: '#c8a24a', hatColor: '#c8a24a' },
      { coat: '#b84a3a', shirt: '#e8e1cf', vest: null, trousers: '#efe6d0', shoes: '#3a2a1a', accent: '#efe3c8', hatColor: '#c8a24a' },
    ],
  },
  medieval: {
    sombreros: ['boina', 'gorra', 'none'], manga: ['larga'], objetos: ['antorcha', 'pergamino', 'mapa'], mundos: ['sala-medieval'], gafas: 0,
    conjuntos: [
      { coat: '#5a6a8a', shirt: '#e8e1cf', vest: null, trousers: '#4a3a2a', shoes: '#2a1c12', accent: '#c8a24a', hatColor: '#7a2a2a' },
      { coat: '#7a2a2a', shirt: '#e8e1cf', vest: null, trousers: '#2c2c36', shoes: '#15151a', accent: '#c8a24a', hatColor: '#2c3a4c' },
      { coat: '#34564a', shirt: '#efe6d0', vest: null, trousers: '#4a3a2a', shoes: '#3a2a1a', accent: '#d3b27a', hatColor: '#4a3a2a' },
      { coat: '#8c6a3a', shirt: '#e8e1cf', vest: null, trousers: '#2c3a4c', shoes: '#2a1c12', accent: '#7a2a2a', hatColor: '#4f7a3a' },
    ],
  },
  traje: {
    sombreros: ['none', 'gorra', 'boina'], manga: ['larga'], objetos: ['libro', 'lupa', 'pluma'], mundos: ['laboratorio-moderno', 'taller-londres'], gafas: 0.35,
    conjuntos: [
      { coat: '#2c3a4c', shirt: '#f4f7fa', vest: null, trousers: '#2c3a4c', shoes: '#15151a', accent: '#c8453f', hatColor: '#2c3a4c' },
      { coat: '#1c2733', shirt: '#e8e1cf', vest: null, trousers: '#1c2733', shoes: '#1d1d22', accent: '#c8a24a', hatColor: '#1c2733' },
      { coat: '#3a3a3a', shirt: '#f4f7fa', vest: null, trousers: '#3a3a3a', shoes: '#15151a', accent: '#3a74c4', hatColor: '#3a3a3a' },
      { coat: '#4a3a2a', shirt: '#e8e1cf', vest: null, trousers: '#4a3a2a', shoes: '#3a2a1a', accent: '#34564a', hatColor: '#4a3a2a' },
    ],
  },
});

/** Objetos que lucen en cada escenario. */
export const MUNDO_OBJETOS = Object.freeze({
  'taller-londres': ['pluma', 'libro', 'mapa', 'lupa'], 'excavacion-egipto': ['cepillo', 'mapa', 'antorcha', 'pergamino'], 'foro-roma': ['pergamino', 'libro'],
  'sala-medieval': ['antorcha', 'pergamino', 'mapa'], 'laboratorio-moderno': ['lupa', 'matraz', 'libro'],
});
/** Color por defecto de cada sombrero cuando se sugiere. */
const COLOR_SOMBRERO = { copa: '#15151a', safari: '#a38b57', bicornio: '#15151a', laurel: '#4f7a3a', gorra: '#2c3a4c', boina: '#7a2a2a' };

/** Oscurece un #rrggbb (sombra de piel o prenda). */
export const sombra = hex => { const n = parseInt(hex.slice(1), 16), f = v => Math.max(0, Math.round(v * 0.82)).toString(16).padStart(2, '0'); return '#' + f(n >> 16 & 255) + f(n >> 8 & 255) + f(n & 255); };
const elegir = (rnd, a) => a[Math.min(a.length - 1, Math.floor(rnd() * a.length))];
const afin = outfit => AFINIDAD[outfit] || AFINIDAD.levita;

/** Viste un look con un conjunto completo de su prenda (colores armonizados, sombrero y manga afines). Muta y devuelve `L`. */
function vestir(L, outfit, rnd) {
  const A = afin(outfit), c = elegir(rnd, A.conjuntos);
  L.outfit = outfit; Object.assign(L, c); L.coatShade = sombra(c.coat);
  L.cravat = outfit === 'traje' ? c.accent : c.shirt;
  L.sleeve = elegir(rnd, A.manga);
  L.hat = elegir(rnd, A.sombreros); if (L.hat !== 'none') L.hatColor = c.hatColor;
  return L;
}
function cara(L, outfit, rnd) {
  L.skin = elegir(rnd, PALETAS.skin); L.skinShade = sombra(L.skin);
  L.beard = rnd() < 0.35 ? elegir(rnd, CATALOGO.beard.filter(b => b !== 'none')) : 'none';
  L.glasses = rnd() < afin(outfit).gafas;
  return L;
}
function pelo(L, rnd) { L.hairStyle = elegir(rnd, CATALOGO.hairStyle); L.hair = elegir(rnd, PALETAS.hair); return L; }
/** Objeto que combina con la prenda y, si se da el escenario, también con él. */
function objetoPara(outfit, world, rnd) {
  const A = afin(outfit).objetos, M = world ? MUNDO_OBJETOS[world] || [] : [];
  const ambos = A.filter(o => M.includes(o));
  return elegir(rnd, ambos.length ? ambos : A);
}

/** Sorpréndeme completo (paso 1A): personaje coherente de pies a cabeza con objeto y escenario afines. Devuelve { look, item, world }. */
export function sorprenderTodo(rnd = Math.random) {
  const outfit = elegir(rnd, CATALOGO.outfit), L = lookOf({});
  vestir(L, outfit, rnd); cara(L, outfit, rnd); pelo(L, rnd);
  const world = elegir(rnd, afin(outfit).mundos);
  return { look: L, item: objetoPara(outfit, world, rnd), world };
}
/** Sorpréndeme de una pestaña (paso 1B): solo cambia lo de esa pestaña, con paleta armonizada. Devuelve el nuevo { look, item, world }. */
export function sorprenderPestana(pestana, estado, rnd = Math.random) {
  const L = { ...estado.look }; let item = estado.item;
  if (pestana === 'cara') cara(L, L.outfit, rnd);
  else if (pestana === 'pelo') pelo(L, rnd);
  else if (pestana === 'ropa') vestir(L, elegir(rnd, CATALOGO.outfit), rnd);
  else if (pestana === 'objeto') item = objetoPara(L.outfit, estado.world, rnd);
  return { look: L, item, world: estado.world };
}
/** Sorpréndeme del paso 2: escenario + objeto que combinan con la prenda. */
export function sorprenderEscenario(estado, rnd = Math.random) {
  const A = afin(estado.look.outfit);
  const candidatos = A.mundos.length > 1 ? A.mundos.filter(m => m !== estado.world) : WORLD_NAMES.filter(m => m !== estado.world);
  const world = elegir(rnd, candidatos.length ? candidatos : WORLD_NAMES);
  return { look: { ...estado.look }, item: objetoPara(estado.look.outfit, world, rnd), world };
}

/**
 * Sugerencias de una línea para `estado` ({ look, item, world }) en el contexto 'personaje' (paso 1) o 'escenario' (paso 2).
 * Cada una trae `texto`, `tipo` (para la reacción) y `cambios` ({ look?, item?, world? }) listos para aplicar. Vacío = nada que sugerir.
 */
export function sugerencias(estado, contexto = 'personaje') {
  const L = estado.look, A = afin(L.outfit), out = [];
  if (contexto === 'personaje') {
    if (!A.sombreros.includes(L.hat)) {
      const h = A.sombreros[0];
      if (h === 'none') out.push({ id: 'sombrero', tipo: 'hat', texto: `${Art(L.outfit)} se lleva sin sombrero`, cambios: { look: { hat: 'none' } } });
      else out.push({ id: 'sombrero', tipo: 'hat', texto: `Con ${art(L.outfit)} va bien ${art(h === 'safari' ? 'hatSafari' : h)}`, cambios: { look: { hat: h, hatColor: COLOR_SOMBRERO[h] } } });
    } else if (L.hat === 'none' && A.sombreros.length > 1 && A.sombreros[0] !== 'none') {
      const h = A.sombreros[0];
      out.push({ id: 'sombrero', tipo: 'hat', texto: `Con ${art(L.outfit)} va bien ${art(h === 'safari' ? 'hatSafari' : h)}`, cambios: { look: { hat: h, hatColor: COLOR_SOMBRERO[h] } } });
    }
    if (!A.manga.includes(L.sleeve)) out.push({ id: 'manga', tipo: 'outfit', texto: `${Art(L.outfit)} va con manga ${A.manga[0]}`, cambios: { look: { sleeve: A.manga[0] } } });
    if (!A.objetos.includes(estado.item)) {
      const o = A.objetos[0];
      out.push({ id: 'objeto', tipo: 'item', texto: estado.item ? `${Art(L.outfit)} combina con ${art(o)}` : `A ${art(L.outfit)} le va ${art(o)}`, cambios: { item: o } });
    }
    return out;
  }
  // escenario
  if (estado.item && !(MUNDO_OBJETOS[estado.world] || []).includes(estado.item)) {
    const donde = A.mundos.find(m => MUNDO_OBJETOS[m].includes(estado.item)) || WORLD_NAMES.find(m => MUNDO_OBJETOS[m].includes(estado.item));
    if (donde && donde !== estado.world) out.push({ id: 'mundo', tipo: 'world', texto: `${Art(estado.item)} se ve mejor en ${art(donde)}`, cambios: { world: donde } });
  }
  if (!out.length && !A.mundos.includes(estado.world)) out.push({ id: 'mundo', tipo: 'world', texto: `${Art(L.outfit)} luce más en ${art(A.mundos[0])}`, cambios: { world: A.mundos[0] } });
  if (!estado.item) {
    const o = A.objetos.find(x => (MUNDO_OBJETOS[estado.world] || []).includes(x)) || (MUNDO_OBJETOS[estado.world] || [])[0];
    if (o) out.push({ id: 'objeto', tipo: 'item', texto: `En ${art(estado.world)} queda bien ${art(o)}`, cambios: { item: o } });
  }
  return out;
}

/** Aplica los `cambios` de una sugerencia sobre un estado y devuelve el nuevo (no muta). */
export const aplicarCambios = (estado, cambios) => ({ ...estado, look: { ...estado.look, ...(cambios.look || {}) }, item: 'item' in cambios ? cambios.item : estado.item, world: cambios.world ?? estado.world });

export const OBJETOS = Object.freeze(Object.keys(ITEMS));
