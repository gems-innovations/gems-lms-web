// Procesado de voz por personaje (puro: Float32Array mono → Float32Array mono). Lo usan el navegador (motores que
// entregan audio: archivos pregenerados o un modelo local) y el script de build que pregenera las voces.
//
//   aplicarPerfil(muestras, 22050, perfilDe('chispa'))  →  más aguda, más rápida y con timbre de robot
//
// Tono y velocidad por separado: se estira el tiempo con WSOLA (solapa ventanas buscando el punto que mejor empalma, así
// no «burbujea») y luego se remuestrea. Efectos: robot (modulación en anillo), eco (retardo con realimentación) y bits.

import { perfilDe } from './perfiles.js?v=2';

/** Estira (α > 1) o encoge (α < 1) el audio sin cambiar el tono. WSOLA simple con correlación diezmada (rápido en móvil). */
export function estirarTiempo(x, sr, alfa) {
  if (!x.length || Math.abs(alfa - 1) < 0.01) return Float32Array.from(x);
  const N = Math.max(64, Math.round(sr * 0.03)) & ~1, Hs = N >> 1, Ha = Hs / alfa, tol = Math.round(sr * 0.008);
  const ventana = new Float32Array(N); for (let i = 0; i < N; i++) ventana[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N);
  const largo = Math.ceil(x.length * alfa) + N, y = new Float32Array(largo), peso = new Float32Array(largo);
  let prev = 0;                                         // dónde quedó el último fragmento copiado (para buscar continuidad)
  for (let k = 0; ; k++) {
    const salida = k * Hs, ideal = Math.round(k * Ha);
    if (ideal + N >= x.length || salida + N >= largo) break;
    let mejor = ideal;
    if (k > 0) {
      const natural = prev + Hs; let max = -Infinity;
      for (let d = -tol; d <= tol; d += 2) {
        const p = ideal + d; if (p < 0 || p + N >= x.length) continue;
        let c = 0; for (let i = 0; i < N; i += 4) c += x[p + i] * (x[natural + i] ?? 0);
        if (c > max) { max = c; mejor = p; }
      }
    }
    for (let i = 0; i < N; i++) { y[salida + i] += x[mejor + i] * ventana[i]; peso[salida + i] += ventana[i]; }
    prev = mejor;
  }
  let fin = largo; while (fin > 0 && peso[fin - 1] === 0) fin--;
  for (let i = 0; i < fin; i++) if (peso[i] > 1e-3) y[i] /= peso[i];
  return y.slice(0, fin);
}

/** Remuestreo lineal: `factor` > 1 acelera y sube el tono. */
export function remuestrear(x, factor) {
  if (Math.abs(factor - 1) < 1e-3) return Float32Array.from(x);
  const n = Math.floor((x.length - 1) / factor), y = new Float32Array(Math.max(0, n));
  for (let i = 0; i < n; i++) { const p = i * factor, j = Math.floor(p), f = p - j; y[i] = x[j] * (1 - f) + x[j + 1] * f; }
  return y;
}

/** Cambia el tono (`semitonos`) y la velocidad (1 = igual) de forma independiente. */
export function tonoYVelocidad(x, sr, semitonos = 0, velocidad = 1) {
  const p = 2 ** (semitonos / 12);
  return remuestrear(estirarTiempo(x, sr, p / velocidad), p);
}

function robot(x, sr, { frecuencia = 50, mezcla = 0.5 }) {
  const w = (2 * Math.PI * frecuencia) / sr;
  for (let i = 0; i < x.length; i++) x[i] = x[i] * (1 - mezcla) + x[i] * Math.sin(w * i) * mezcla * 1.6;
  return x;
}

function eco(x, sr, { retardo = 0.12, realimentacion = 0.3, mezcla = 0.3 }) {
  const d = Math.max(1, Math.round(retardo * sr)), cola = Math.round(d * Math.log(0.01) / Math.log(Math.max(0.05, realimentacion)));
  const y = new Float32Array(x.length + Math.min(cola, sr)), linea = new Float32Array(y.length);
  for (let i = 0; i < y.length; i++) {
    const seco = i < x.length ? x[i] : 0;
    linea[i] = seco + (i >= d ? linea[i - d] * realimentacion : 0);
    y[i] = seco + (i >= d ? linea[i - d] : 0) * mezcla;
  }
  return y;
}

function bits(x, sr, { niveles = 48, retener = 2, mezcla = 0.3 }) {
  let hold = 0;
  for (let i = 0; i < x.length; i++) { if (i % retener === 0) hold = Math.round(x[i] * niveles) / niveles; x[i] = x[i] * (1 - mezcla) + hold * mezcla; }
  return x;
}

const EFECTOS = { robot, eco, bits };
export const TIPOS_EFECTO = Object.freeze(Object.keys(EFECTOS));

/** Deja el pico en `pico` (−1 dBFS por defecto) y suaviza 5 ms en los bordes. */
export function normalizar(x, sr, pico = 0.89) {
  let max = 0; for (const v of x) max = Math.max(max, Math.abs(v));
  if (max > 0) for (let i = 0; i < x.length; i++) x[i] *= pico / max;
  const f = Math.min(x.length >> 1, Math.round(sr * 0.005));
  for (let i = 0; i < f; i++) { x[i] *= i / f; x[x.length - 1 - i] *= i / f; }
  return x;
}

/**
 * Aplica un perfil completo (tono, velocidad y cadena de efectos) a una voz base.
 * @param {Float32Array} muestras  voz base mono
 * @param {number} sr              frecuencia de muestreo
 * @param {object|string} perfil   perfil (perfiles.js) o id de personaje
 * @param {{velocidadYaAplicada?: boolean}} [o]  si el motor ya habló a la velocidad del perfil (p. ej. Piper con length_scale)
 */
export function aplicarPerfil(muestras, sr, perfil, o = {}) {
  const p = perfilDe(perfil);
  let x = tonoYVelocidad(muestras, sr, p.semitonos, o.velocidadYaAplicada ? 1 : p.velocidad);
  for (const e of p.efectos || []) x = EFECTOS[e.tipo] ? EFECTOS[e.tipo](x, sr, e) : x;
  return normalizar(x, sr);
}

export default { aplicarPerfil, tonoYVelocidad, estirarTiempo, remuestrear, normalizar, TIPOS_EFECTO };
