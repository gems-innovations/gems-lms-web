// Perfiles de voz por personaje (puro: sin DOM). Un perfil describe CÓMO habla alguien, sin atarse a un motor de voz:
//   · `semitonos` y `velocidad`: tono y ritmo.
//   · `genero`: qué voz base preferir cuando el motor tiene varias (Web Speech) o qué modelo usar al pregenerar.
//   · `efectos`: cadena de efectos sobre el audio (robot, eco, bits). Solo aplican a motores que entregan audio
//     (archivos pregenerados o un modelo local): la voz del sistema (Web Speech) no deja procesar su salida.
//
// Para darle voz a un personaje nuevo basta agregar su id aquí (el mismo id que en theme.json → characters).

/** @typedef {{tipo: 'robot', frecuencia: number, mezcla: number} | {tipo: 'eco', retardo: number, realimentacion: number, mezcla: number} | {tipo: 'bits', niveles: number, retener: number, mezcla: number}} IEfectoVoz */
/** @typedef {{id: string, nombre: string, genero: 'f'|'m', semitonos: number, velocidad: number, efectos: IEfectoVoz[], descripcion: string}} IPerfilVoz */

/** @type {Record<string, IPerfilVoz>} */
export const PERFILES = Object.freeze({
  narrador: { id: 'narrador', nombre: 'Narrador', genero: 'f', semitonos: 0, velocidad: 1, efectos: [], descripcion: 'Voz neutra, sin efectos.' },
  // Minecraft: chicos de un mundo de bloques. Un toque de «8 bits» suave para que suenen a videojuego sin perder claridad.
  leo:   { id: 'leo', nombre: 'Leo', genero: 'm', semitonos: 3, velocidad: 1.06, descripcion: 'Chico entusiasta, rápido, con un grano de 8 bits.',
           efectos: [{ tipo: 'bits', niveles: 48, retener: 2, mezcla: 0.35 }] },
  sofi:  { id: 'sofi', nombre: 'Sofi', genero: 'f', semitonos: 2, velocidad: 1.02, descripcion: 'Chica segura y clara, un poco de sala (eco corto).',
           efectos: [{ tipo: 'eco', retardo: 0.06, realimentacion: 0.15, mezcla: 0.18 }] },
  mateo: { id: 'mateo', nombre: 'Mateo', genero: 'm', semitonos: 0, velocidad: 0.98, descripcion: 'Chico tranquilo, voz algo más grave.',
           efectos: [{ tipo: 'bits', niveles: 64, retener: 2, mezcla: 0.25 }] },
  dani:  { id: 'dani', nombre: 'Dani', genero: 'f', semitonos: 4, velocidad: 1.08, descripcion: 'Chica inquieta, aguda y rápida.',
           efectos: [{ tipo: 'bits', niveles: 48, retener: 2, mezcla: 0.3 }] },
  // Estudio: robots. Chispa es eléctrico (modulación en anillo rápida); Nube es calmado y flota (eco y robot muy suave).
  chispa: { id: 'chispa', nombre: 'Chispa', genero: 'm', semitonos: 5, velocidad: 1.12, descripcion: 'Robot eléctrico: agudo, rápido y metálico.',
            efectos: [{ tipo: 'robot', frecuencia: 55, mezcla: 0.55 }, { tipo: 'bits', niveles: 32, retener: 1, mezcla: 0.2 }] },
  nube:   { id: 'nube', nombre: 'Nube', genero: 'f', semitonos: -1, velocidad: 0.92, descripcion: 'Robot sereno: grave, pausado y con eco de nube.',
            efectos: [{ tipo: 'robot', frecuencia: 30, mezcla: 0.25 }, { tipo: 'eco', retardo: 0.14, realimentacion: 0.35, mezcla: 0.32 }] },
});

/** Perfil de un personaje (id del tema, sin importar mayúsculas). Sin perfil propio: el narrador. Acepta un perfil ya armado. */
export function perfilDe(personaje) {
  if (personaje && typeof personaje === 'object') return { ...PERFILES.narrador, ...personaje };
  return PERFILES[String(personaje ?? '').toLowerCase()] ?? PERFILES.narrador;
}

/**
 * Tono y velocidad para `SpeechSynthesisUtterance` (pitch 0-2, rate 0.1-10). El pitch no es exacto en semitonos (cada
 * sistema lo interpreta a su modo), pero respeta el orden: más semitonos, más aguda.
 */
export function parametrosWebSpeech(perfil) {
  const p = perfilDe(perfil);
  return { pitch: Math.min(2, Math.max(0.1, 1 + p.semitonos * 0.08)), rate: Math.min(1.6, Math.max(0.6, p.velocidad)) };
}

const NOMBRES = {
  f: /(helena|laura|sabina|paulina|monica|mónica|elvira|dalia|lupe|marisol|ximena|salome|salomé|paloma|camila|conchita|lucia|lucía|elena|francisca|valentina|\bfemale\b|mujer)/i,
  m: /(pablo|jorge|juan|diego|raul|raúl|gonzalo|alvaro|álvaro|enrique|carlos|miguel|andres|andrés|tomas|tomás|gerardo|\bmale\b|hombre)/i,
};
/** Preferencia de acento: Colombia primero, luego Latinoamérica y EE. UU., luego cualquier español. */
const ACENTO = [[/^es[-_]co/i, 100], [/^es[-_](419|mx|us|ar|cl|pe|ve|ec|uy|py|bo|cr|pa|do|gt|hn|ni|sv|pr|cu)/i, 80], [/^es[-_]es/i, 55], [/^es\b/i, 50]];

/**
 * Elige la voz del sistema para un perfil. Puro: recibe la lista de `speechSynthesis.getVoices()` (o algo con la misma forma).
 * Privacidad: por defecto SOLO voces locales (`localService`). Las voces «en línea» (p. ej. «Google español» en Chrome de
 * escritorio o las «Online (Natural)» de Edge) mandan el texto a un servidor de terceros, y Taps no envía nada fuera.
 * @param {{name: string, lang: string, localService?: boolean, default?: boolean}[]} voces
 * @param {object|string} perfil
 * @param {{permitirEnLinea?: boolean}} [o]
 */
export function elegirVoz(voces, perfil, o = {}) {
  const p = perfilDe(perfil);
  let mejor = null, puntos = -1;
  for (const v of voces || []) {
    if (!v?.lang || (!o.permitirEnLinea && v.localService === false)) continue;
    const acento = ACENTO.find(([re]) => re.test(v.lang))?.[1] ?? 0;
    if (!acento) continue;
    const otro = p.genero === 'f' ? 'm' : 'f';
    const s = acento + (NOMBRES[p.genero].test(v.name) ? 15 : NOMBRES[otro].test(v.name) ? -15 : 0) + (v.default ? 2 : 0);
    if (s > puntos) { puntos = s; mejor = v; }
  }
  return mejor;
}

/** Texto normalizado para hablar y para la clave de audios pregenerados (espacios, comillas y emojis fuera). */
export function normalizarTexto(texto) {
  return String(texto ?? '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').replace(/[«»"“”]/g, '').replace(/\s+/g, ' ').trim();
}

/** Clave estable (FNV-1a de 32 bits, hex) de un audio pregenerado: perfil + texto. La usan el script de build y el navegador. */
export function claveAudio(perfil, texto) {
  const s = perfilDe(perfil).id + '|' + normalizarTexto(texto);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

export default { PERFILES, perfilDe, parametrosWebSpeech, elegirVoz, normalizarTexto, claveAudio };
