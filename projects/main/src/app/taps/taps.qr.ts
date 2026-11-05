/**
 * Código QR propio, sin dependencias: modo byte (UTF-8), corrección M, versiones 1–10 (hasta 213 bytes; un enlace /t/u-… usa ~45).
 * Sigue ISO/IEC 18004 al modo de Nayuki (QR Code generator, MIT). Devuelve la matriz (true = oscuro) o null si no cabe.
 */

/** Corrección M por versión: [ec por bloque, bloques cortos, datos por bloque corto, bloques largos, datos por bloque largo]. */
const BLOQUES_M: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [10, 1, 16, 0, 0], [16, 1, 28, 0, 0], [26, 1, 44, 0, 0], [18, 2, 32, 0, 0], [24, 2, 43, 0, 0],
  [16, 4, 27, 0, 0], [18, 4, 31, 0, 0], [22, 2, 38, 2, 39], [22, 3, 36, 2, 37], [26, 4, 43, 1, 44],
];
const ALINEACION: ReadonlyArray<readonly number[]> = [
  [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50],
];

const bit = (x: number, i: number) => ((x >>> i) & 1) !== 0;

function mulGF(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; }
  return z;
}

function correccion(datos: number[], grado: number): number[] {
  const div = new Array<number>(grado).fill(0); div[grado - 1] = 1;
  let raiz = 1;
  for (let i = 0; i < grado; i++) {
    for (let j = 0; j < grado; j++) { div[j] = mulGF(div[j], raiz); if (j + 1 < grado) div[j] ^= div[j + 1]; }
    raiz = mulGF(raiz, 2);
  }
  const res = new Array<number>(grado).fill(0);
  for (const b of datos) {
    const f = b ^ (res.shift() as number); res.push(0);
    div.forEach((c, i) => { res[i] ^= mulGF(c, f); });
  }
  return res;
}

const MASCARAS: ReadonlyArray<(x: number, y: number) => boolean> = [
  (x, y) => (x + y) % 2 === 0, (_x, y) => y % 2 === 0, x => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => (x * y) % 2 + (x * y) % 3 === 0,
  (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0, (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0,
];

export function qr(texto: string): boolean[][] | null {
  const bytes = Array.from(new TextEncoder().encode(texto));
  const ver = BLOQUES_M.findIndex(([, b1, d1, b2, d2], i) => 4 + (i < 9 ? 8 : 16) + 8 * bytes.length <= 8 * (b1 * d1 + b2 * d2)) + 1;
  if (!ver) return null;
  const [ec, b1, d1, b2, d2] = BLOQUES_M[ver - 1];
  const capacidad = b1 * d1 + b2 * d2;

  // Flujo de bits: modo byte, longitud, datos, terminador y relleno.
  const bits: boolean[] = [];
  const poner = (v: number, n: number) => { for (let i = n - 1; i >= 0; i--) bits.push(bit(v, i)); };
  poner(0b0100, 4); poner(bytes.length, ver < 10 ? 8 : 16); bytes.forEach(b => poner(b, 8));
  poner(0, Math.min(4, capacidad * 8 - bits.length));
  poner(0, (8 - bits.length % 8) % 8);
  const datos: number[] = [];
  for (let i = 0; i < bits.length; i += 8) datos.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | (b ? 1 : 0), 0));
  for (let p = 0xec; datos.length < capacidad; p ^= 0xec ^ 0x11) datos.push(p);

  // Bloques con su corrección, intercalados.
  const bloques: number[][] = [];
  for (let i = 0, k = 0; i < b1 + b2; i++) { const n = i < b1 ? d1 : d2; bloques.push(datos.slice(k, k + n)); k += n; }
  const correcciones = bloques.map(b => correccion(b, ec));
  const flujo: number[] = [];
  for (let i = 0; i < Math.max(d1, d2); i++) for (const b of bloques) if (i < b.length) flujo.push(b[i]);
  for (let i = 0; i < ec; i++) for (const c of correcciones) flujo.push(c[i]);

  const n = 17 + 4 * ver;
  const m: boolean[][] = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));
  const fija: boolean[][] = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));
  const fijar = (x: number, y: number, v: boolean, t = m) => { t[y][x] = v; fija[y][x] = true; };

  for (let i = 0; i < n; i++) { fijar(6, i, i % 2 === 0); fijar(i, 6, i % 2 === 0); }
  for (const [cx, cy] of [[3, 3], [n - 4, 3], [3, n - 4]]) {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy));
      if (x >= 0 && x < n && y >= 0 && y < n) fijar(x, y, d !== 2 && d !== 4);
    }
  }
  const al = ALINEACION[ver - 1], u = al.length - 1;
  al.forEach((ax, i) => al.forEach((ay, j) => {
    if ((i === 0 && j === 0) || (i === 0 && j === u) || (i === u && j === 0)) return;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) fijar(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }));
  const formato = (mascara: number, t = m) => {
    const d = mascara; // corrección M = 00
    let r = d; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    const f = ((d << 10) | r) ^ 0x5412;
    for (let i = 0; i <= 5; i++) fijar(8, i, bit(f, i), t);
    fijar(8, 7, bit(f, 6), t); fijar(8, 8, bit(f, 7), t); fijar(7, 8, bit(f, 8), t);
    for (let i = 9; i < 15; i++) fijar(14 - i, 8, bit(f, i), t);
    for (let i = 0; i < 8; i++) fijar(n - 1 - i, 8, bit(f, i), t);
    for (let i = 8; i < 15; i++) fijar(8, n - 15 + i, bit(f, i), t);
    fijar(8, n - 8, true, t);
  };
  formato(0);
  if (ver >= 7) {
    let r = ver; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
    const v = (ver << 12) | r;
    for (let i = 0; i < 18; i++) { const a = n - 11 + (i % 3), b = Math.floor(i / 3); fijar(a, b, bit(v, i)); fijar(b, a, bit(v, i)); }
  }

  // Datos en zigzag, de dos en dos columnas desde abajo a la derecha.
  let k = 0;
  for (let der = n - 1; der >= 1; der -= 2) {
    if (der === 6) der = 5;
    for (let vert = 0; vert < n; vert++) for (let j = 0; j < 2; j++) {
      const x = der - j, y = ((der + 1) & 2) === 0 ? n - 1 - vert : vert;
      if (!fija[y][x] && k < flujo.length * 8) { m[y][x] = bit(flujo[k >>> 3], 7 - (k & 7)); k++; }
    }
  }

  // La máscara con menos penalización.
  let mejor: boolean[][] = m, menor = Infinity;
  MASCARAS.forEach((f, i) => {
    const copia = m.map((fila, y) => fila.map((v, x) => (!fija[y][x] && f(x, y) ? !v : v)));
    formato(i, copia);
    const p = penalizacion(copia);
    if (p < menor) { menor = p; mejor = copia; }
  });
  return mejor;
}

function penalizacion(m: boolean[][]): number {
  const n = m.length; let p = 0, oscuros = 0;
  const lineas = [...m, ...m[0].map((_, x) => m.map(f => f[x]))];
  const patron = [true, false, true, true, true, false, true];
  for (const l of lineas) {
    for (let i = 0, run = 1; i < n; i++, run++) {
      if (i + 1 < n && l[i + 1] === l[i]) continue;
      if (run >= 5) p += run - 2;
      run = 0;
    }
    for (let i = 0; i + 7 <= n; i++) {
      if (!patron.every((v, j) => l[i + j] === v)) continue;
      const claro = (a: number, b: number) => { for (let j = a; j < b; j++) if (j >= 0 && j < n && l[j]) return false; return true; };
      if (claro(i - 4, i) || claro(i + 7, i + 11)) p += 40;
    }
  }
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (m[y][x]) oscuros++;
    if (x + 1 < n && y + 1 < n && m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) p += 3;
  }
  return p + 10 * Math.floor(Math.abs(oscuros * 20 / (n * n) - 10));
}

/** El trazo SVG de los módulos oscuros (un cuadro de 1×1 por módulo); el margen de 4 lo pone el `viewBox`. */
export function qrTrazo(m: boolean[][]): string {
  let d = '';
  m.forEach((fila, y) => fila.forEach((v, x) => { if (v) d += `M${x} ${y}h1v1h-1z`; }));
  return d;
}
