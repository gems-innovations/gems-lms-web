// Hitos de cuenta (PR-D2, disenador-v2-plan.md §2): una vez por sesión, nunca dos en < 45 s, estudiante apaga todo, copy sin culpa.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLAVE_ESTUDIANTE, CLAVE_SESION, COPY_HITOS, ENTENDIDO, HITOS, MIN_ENTRE_AVISOS_MS, PUBLICAR, QUE_ES, conNombre, crearHitos, esEstudiante,
} from '../public/taps-engine/themes/epoca/hitos.js';

function memoria({ roto = false } = {}) {
  const m = new Map(); const falla = () => { if (roto) throw new DOMException('bloqueado', 'SecurityError'); };
  return { getItem: k => (falla(), m.has(k) ? m.get(k) : null), setItem: (k, v) => (falla(), m.set(k, String(v))), removeItem: k => (falla(), m.delete(k)), mapa: m };
}
function reloj(inicio = 100_000) { let t = inicio; return { ahora: () => t, avanzar: ms => { t += ms; } }; }

test('hitos: cada hito se enseña una sola vez por sesión', () => {
  const r = reloj(), h = crearHitos({ ahora: r.ahora });
  assert.equal(h.puede('navegador'), true);
  assert.equal(h.mostrar('navegador'), true);
  assert.equal(h.visto('navegador'), true);
  r.avanzar(MIN_ENTRE_AVISOS_MS * 10);
  assert.equal(h.puede('navegador'), false, 'ya se enseñó en esta sesión');
  assert.equal(h.mostrar('navegador'), false);
  assert.equal(h.mostrar('inventado'), false, 'solo los hitos de la lista');
});

test('hitos: nunca dos avisos en menos de 45 s; el que llega antes se salta y puede volver después', () => {
  const r = reloj(), h = crearHitos({ ahora: r.ahora });
  assert.equal(h.mostrar('listo'), true);
  r.avanzar(20_000);
  assert.equal(h.puede('guardado'), false, 'a los 20 s no');
  assert.equal(h.mostrar('guardado'), false);
  assert.equal(h.visto('guardado'), false, 'saltarse no consume el hito');
  r.avanzar(MIN_ENTRE_AVISOS_MS - 20_000 - 1);
  assert.equal(h.puede('guardado'), false, 'a 44,999 s todavía no');
  r.avanzar(1);
  assert.equal(h.mostrar('guardado'), true, 'a los 45 s exactos sí');
  assert.equal(h.puede('probado'), false, 'y el siguiente vuelve a esperar');
  r.avanzar(MIN_ENTRE_AVISOS_MS);
  assert.equal(h.mostrar('probado'), true);
  assert.equal(MIN_ENTRE_AVISOS_MS, 45_000);
});

test('hitos: `sinEspera` (bloque fijo de Listo) salta el mínimo pero arranca el reloj y sigue siendo una vez por sesión', () => {
  const r = reloj(), h = crearHitos({ ahora: r.ahora });
  assert.equal(h.mostrar('navegador'), true);
  r.avanzar(5_000);
  assert.equal(h.mostrar('listo'), false, 'como aviso normal esperaría');
  assert.equal(h.mostrar('listo', { sinEspera: true }), true, 'como contenido del paso entra');
  assert.equal(h.mostrar('listo', { sinEspera: true }), false, 'pero una vez por sesión');
  r.avanzar(MIN_ENTRE_AVISOS_MS - 1);
  assert.equal(h.puede('guardado'), false, 'el bloque arrancó el reloj de 45 s');
  r.avanzar(1);
  assert.equal(h.puede('guardado'), true);
  const est = crearHitos({ ahora: r.ahora, estudiante: () => true });
  assert.equal(est.mostrar('listo', { sinEspera: true }), false, 'estudiante: tampoco el bloque');
});

test('hitos: «Soy estudiante» apaga todos los avisos, también a mitad de sesión', () => {
  const local = memoria(), r = reloj();
  const h = crearHitos({ ahora: r.ahora, estudiante: () => esEstudiante(local) });
  assert.equal(h.puede('navegador'), true);
  local.setItem(CLAVE_ESTUDIANTE, '1');
  assert.equal(h.apagado, true);
  for (const hito of HITOS) { assert.equal(h.puede(hito), false, hito); assert.equal(h.mostrar(hito), false, hito); }
  assert.equal(esEstudiante(memoria({ roto: true })), false, 'almacén roto: no es estudiante, no rompe');
  assert.equal(esEstudiante(null), false);
});

test('hitos: lo enseñado y el último aviso se guardan en sessionStorage y sobreviven a recargar; sin almacén, en memoria', () => {
  const sesion = memoria(), r = reloj();
  const h1 = crearHitos({ ahora: r.ahora, sesion });
  assert.equal(h1.mostrar('navegador'), true);
  const guardado = JSON.parse(sesion.getItem(CLAVE_SESION));
  assert.deepEqual(guardado, { vistos: ['navegador'], ultimo: r.ahora() });
  r.avanzar(10_000);
  const h2 = crearHitos({ ahora: r.ahora, sesion });                  // «recarga»
  assert.equal(h2.visto('navegador'), true);
  assert.equal(h2.puede('listo'), false, 'el reloj del último aviso también sobrevive');
  r.avanzar(MIN_ENTRE_AVISOS_MS);
  assert.equal(h2.mostrar('listo'), true);
  // Basura en el almacén: se ignora.
  sesion.setItem(CLAVE_SESION, '{"vistos":["x","listo"],"ultimo":"ayer"}');
  const h3 = crearHitos({ ahora: r.ahora, sesion });
  assert.equal(h3.visto('listo'), true); assert.equal(h3.visto('x'), false); assert.equal(h3.puede('navegador'), true);
  sesion.setItem(CLAVE_SESION, 'no es json');
  assert.equal(crearHitos({ ahora: r.ahora, sesion }).puede('navegador'), true);
  const roto = crearHitos({ ahora: r.ahora, sesion: memoria({ roto: true }) });
  assert.equal(roto.mostrar('navegador'), true); assert.equal(roto.puede('navegador'), false);
  assert.equal(crearHitos({ ahora: r.ahora, sesion: null }).mostrar('vuelve'), true);
});

test('hitos: copy de §2 sin culpa, sin urgencia, sin emojis, una ventaja por hito y salida normal', () => {
  const emoji = /\p{Extended_Pictographic}/u;
  const textos = [];
  for (const h of HITOS) {
    const c = COPY_HITOS[h]; assert.ok(c, h);
    if (c.texto) { textos.push(c.texto); assert.ok(c.icono.startsWith('i-'), 'icono dibujado'); assert.ok(c.botones.length >= 1 && c.botones.length <= 2, 'una o dos salidas, botones normales'); textos.push(...c.botones); }
    if (c.tarjetas) { textos.push(c.titulo, ...c.tarjetas.flatMap(t => [t.texto, t.detalle])); assert.equal(c.tarjetas.length, 3); assert.equal(c.tarjetas[2].texto, 'Publicar un Tap (con cuenta)'); }
  }
  const todo = textos.join(' ').toLowerCase();
  for (const prohibido of ['no pierdas', 'última oportunidad', 'solo hoy', 'date prisa', 'no te quedes', 'no, no quiero', 'última', 'ahora o nunca']) assert.ok(!todo.includes(prohibido), prohibido);
  for (const t of textos) { assert.doesNotMatch(t, emoji); assert.ok(!/\d+\s*(s|seg|min)\b/.test(t), 'sin contadores'); }
  assert.ok(COPY_HITOS.navegador.texto.includes('vive en este navegador'));
  assert.ok(COPY_HITOS.navegador.texto.includes('todos tus dispositivos'));
  assert.equal(COPY_HITOS.guardado.texto, 'Guardado en este navegador. Si lo borras o cambias de celular, se pierde. Con cuenta no.');
  assert.ok(COPY_HITOS.probado.texto.includes('quien lo juegue'));
  assert.deepEqual(COPY_HITOS.navegador.botones, [ENTENDIDO, QUE_ES]);
  assert.deepEqual(COPY_HITOS.probado.botones, [PUBLICAR]);
  assert.equal(conNombre(COPY_HITOS.vuelve.texto, 'Nefer'), 'Volviste por Nefer. Con cuenta no dependes de este navegador.');
  assert.equal(conNombre(COPY_HITOS.listo.titulo, '  '), 'Lo que puedes hacer con tu personaje');
  assert.equal(conNombre('{nombre}', '<b>x</b>'), '<b>x</b>', 'texto plano: quien lo pinta usa textContent');
});
