// Partículas del diseñador dibujadas en el canvas (PR-D5, producto/taps/disenador-v2-plan.md §4). Sustituyen a las chispas
// en DOM (18 <span> con animación CSS por guardado): aquí hay un pool fijo de MAX_PARTICULAS objetos que se reutilizan, nada se
// crea ni se destruye por cuadro y todo se pinta en el mismo `dibujar()` del personaje, en píxeles CSS de la vista.
//
// Tres tipos:
// - `polvo`: polvo dorado al cambiar una pieza (6 partículas desde donde está el chip, suben y se apagan).
// - `anillo`: anillo de luz al elegir un color (sale del chip y llega al personaje: conecta el control con el resultado).
// - `confeti`: papelitos con los colores del look (rectángulos que giran y caen) en Listo y al guardar.
//
// Reglas: tope de 40 partículas vivas (si el pool está lleno se recicla la más vieja, nunca crece); con `prefers-reduced-motion`
// (`reducido: true`) ningún emisor emite; `degradar()` (lo llama el diseñador al medir `fps-bajo`) deja la mitad de partículas por
// ráfaga y quita la sombra brillante, para gama baja. Es un módulo puro (sin DOM): `paso(dt)` avanza, `dibujar(ctx)` pinta.

export const MAX_PARTICULAS = 40;
export const TIPOS = Object.freeze(['polvo', 'anillo', 'confeti']);
/** Cuántas partículas emite cada ráfaga a tamaño normal; con `degradar()` la mitad (redondeo hacia arriba, mínimo 1). */
export const RAFAGA = Object.freeze({ polvo: 6, anillo: 1, confeti: 24 });
/** Duración de vida en segundos por tipo. */
export const VIDA = Object.freeze({ polvo: 0.7, anillo: 0.45, confeti: 1.4 });
const ORO = '#f0d08a';
const GRAVEDAD = 420;                                                        // px/s² del confeti

const nueva = () => ({ viva: false, tipo: 'polvo', x: 0, y: 0, vx: 0, vy: 0, t: 0, vida: 1, tam: 4, giro: 0, vgiro: 0, color: ORO, x1: 0, y1: 0, r0: 0, r1: 0, nacida: 0 });

/**
 * Crea el sistema. `azar` se puede inyectar para pruebas deterministas; `reducido` apaga todo (los emisores devuelven 0 y no hay
 * nada que dibujar); `max` solo baja el tope (nunca pasa de MAX_PARTICULAS).
 */
export function crearParticulas({ max = MAX_PARTICULAS, reducido = false, azar = Math.random } = {}) {
  const tope = Math.max(1, Math.min(MAX_PARTICULAS, Math.floor(max) || MAX_PARTICULAS));
  const pool = Array.from({ length: tope }, nueva);
  let degradado = false, orden = 0;
  const entre = (a, b) => a + (b - a) * azar();

  /** Una ranura libre o, si todas están ocupadas, la más vieja (se recicla: el pool nunca crece). */
  function ranura() {
    let vieja = pool[0];
    for (const p of pool) { if (!p.viva) return p; if (p.nacida < vieja.nacida) vieja = p; }
    return vieja;
  }
  function cuantas(tipo) { const n = RAFAGA[tipo]; return degradado ? Math.max(1, Math.ceil(n / 2)) : n; }
  function encender(p, tipo, vida) { p.viva = true; p.tipo = tipo; p.t = 0; p.vida = vida; p.nacida = ++orden; return p; }

  /** Polvo dorado desde (x, y). Devuelve cuántas se emitieron. */
  function polvo(x, y, { color = ORO, n = cuantas('polvo') } = {}) {
    if (reducido) return 0;
    for (let i = 0; i < n; i++) {
      const p = encender(ranura(), 'polvo', VIDA.polvo * entre(0.75, 1.1));
      const a = entre(-Math.PI * 0.85, -Math.PI * 0.15), v = entre(50, 120);  // hacia arriba, abriéndose
      p.x = x + entre(-6, 6); p.y = y + entre(-4, 4); p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v;
      p.tam = entre(2.2, 4.2); p.color = color; p.giro = 0; p.vgiro = 0;
    }
    return n;
  }
  /** Anillo de luz que sale de (x0, y0) con radio `r0` y llega a (x1, y1) con radio `r1`. Devuelve 1 (o 0 si reducido). */
  function anillo(x0, y0, x1, y1, { color = ORO, r0 = 10, r1 = 70 } = {}) {
    if (reducido) return 0;
    const p = encender(ranura(), 'anillo', VIDA.anillo);
    p.x = x0; p.y = y0; p.x1 = x1; p.y1 = y1; p.r0 = r0; p.r1 = r1; p.color = color; p.vx = p.vy = 0; p.tam = 2.5;
    return 1;
  }
  /** Confeti de papel desde (x, y) con los colores del look (si la lista viene vacía, oro). Devuelve cuántas se emitieron. */
  function confeti(x, y, colores = [], { n = cuantas('confeti'), ancho = 80 } = {}) {
    if (reducido) return 0;
    const paleta = colores.filter(c => typeof c === 'string' && c);
    if (!paleta.length) paleta.push(ORO);
    for (let i = 0; i < n; i++) {
      const p = encender(ranura(), 'confeti', VIDA.confeti * entre(0.8, 1.05));
      p.x = x + entre(-ancho / 2, ancho / 2); p.y = y + entre(-6, 6);
      p.vx = entre(-140, 140); p.vy = entre(-230, -60);
      p.tam = entre(5, 9); p.giro = entre(0, Math.PI); p.vgiro = entre(-9, 9);
      p.color = paleta[Math.floor(azar() * paleta.length)] ?? paleta[0];
    }
    return n;
  }
  /** Avanza `dt` segundos. Devuelve cuántas siguen vivas. */
  function paso(dt) {
    if (!(dt > 0)) return vivas();
    let n = 0;
    for (const p of pool) {
      if (!p.viva) continue;
      p.t += dt;
      if (p.t >= p.vida) { p.viva = false; continue; }
      if (p.tipo === 'confeti') { p.vy += GRAVEDAD * dt; p.vx *= 1 - Math.min(1, 1.6 * dt); p.giro += p.vgiro * dt; }
      else if (p.tipo === 'polvo') { p.vy -= 30 * dt; p.vx *= 1 - Math.min(1, 2 * dt); }
      if (p.tipo !== 'anillo') { p.x += p.vx * dt; p.y += p.vy * dt; }
      n++;
    }
    return n;
  }
  /** Pinta las vivas en `ctx` (píxeles CSS; quien llama fija la transformación). */
  function dibujar(ctx) {
    let pintadas = 0;
    for (const p of pool) {
      if (!p.viva) continue;
      const u = p.t / p.vida;
      ctx.save();
      if (p.tipo === 'polvo') {
        ctx.globalAlpha = 1 - u * u; ctx.fillStyle = p.color;
        if (!degradado) { ctx.shadowColor = p.color; ctx.shadowBlur = 8; }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.tam * (1 - u * 0.6), 0, Math.PI * 2); ctx.fill();
      } else if (p.tipo === 'anillo') {
        const k = 1 - (1 - u) * (1 - u);                                   // ease-out: sale rápido del chip
        const x = p.x + (p.x1 - p.x) * k, y = p.y + (p.y1 - p.y) * k, r = p.r0 + (p.r1 - p.r0) * k;
        ctx.globalAlpha = 0.9 * (1 - u); ctx.strokeStyle = p.color; ctx.lineWidth = p.tam * (1.4 - u);
        if (!degradado) { ctx.shadowColor = p.color; ctx.shadowBlur = 10; }
        ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.globalAlpha = u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3; ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y); ctx.rotate(p.giro); ctx.scale(1, 0.55 + 0.45 * Math.cos(p.giro * 2));   // el papel «gira» en 3D
        ctx.fillRect(-p.tam / 2, -p.tam * 0.3, p.tam, p.tam * 0.6);
      }
      ctx.restore(); pintadas++;
    }
    return pintadas;
  }
  function vivas() { let n = 0; for (const p of pool) if (p.viva) n++; return n; }
  function limpiar() { for (const p of pool) p.viva = false; }
  function degradar() { degradado = true; }

  return Object.freeze({
    polvo, anillo, confeti, paso, dibujar, vivas, limpiar, degradar,
    get max() { return tope; }, get degradado() { return degradado; }, get reducido() { return reducido; },
    /** Tamaño real del pool (constante): la prueba de «nunca pasa de 40» mira esto y `vivas()`. */
    get tamanoPool() { return pool.length; },
  });
}
