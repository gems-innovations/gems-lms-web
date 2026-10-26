// Medición (PR-5): nombres válidos, agregación de `cambio/*` por pestaña y minuto, cola con tope, `?interno=1`,
// redondeo de segundos y navegadores automatizados. Nada toca window ni la red.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLAVE_INTERNO, MAX_COLA, MAX_SEGUNDOS, PASOS, PESTANAS, PREFIJO, VENTANA_CAMBIO_MS, banderaInterna, crearMedidor, esAutomatico, esInterno,
  nombreAbandono, nombreValido, paraGoatCounter, redondear10,
} from '../public/taps-engine/themes/epoca/medicion.js';

function memoria({ roto = false } = {}) {
  const m = new Map(); const falla = () => { if (roto) throw new DOMException('bloqueado', 'SecurityError'); };
  return { getItem: k => (falla(), m.has(k) ? m.get(k) : null), setItem: (k, v) => (falla(), m.set(k, String(v))), removeItem: k => (falla(), m.delete(k)), mapa: m };
}
function reloj(inicio = 0) { let t = inicio; return { ahora: () => t, avanzar: ms => { t += ms; } }; }

test('medición: acepta exactamente la taxonomía del plan (§4) y rechaza lo demás', () => {
  const buenos = [
    'abrir/enlace', 'abrir/continuar', 'abrir/directo', 'preset/grabador', 'preset/arqueologa', 'cambio/cara', 'cambio/objeto',
    'sorprendeme/ropa', 'sorprendeme/todo', 'sorprendeme/escenario', 'deshacer', 'paso/escenario', 'paso/listo', 'probar', 'listo',
    'compartir/enlace', 'compartir/json', 'gusto/si', 'gusto/meh', 'abandono/personaje/40', 'abandono/partida/0', 'abandono/listo/3600',
    'fps-bajo', 'error/carga', 'error/look-invalido', 'encuadre/cara', 'encuadre/objeto',
  ];
  for (const b of buenos) { assert.equal(nombreValido(b), b, b); assert.equal(nombreValido(PREFIJO + b), b, 'con prefijo: ' + b); }
  const malos = [
    '', null, undefined, 42, 'abrir', 'abrir/feed', 'preset/', 'preset/Grabador', 'preset/' + 'x'.repeat(41), 'cambio/piel', 'cambio',
    'sorprendeme', 'paso/personaje', 'listo/si', 'compartir', 'gusto/no', 'abandono/personaje', 'abandono/personaje/45', 'abandono/personaje/05',
    'abandono/otro/10', 'abandono/personaje/99999', 'error/red', 'taps/ver/x', 'taps/disenador/', 'look={"hat":"copa"}', 'cambio/cara/#ff0000',
  ];
  for (const m of malos) assert.equal(nombreValido(m), null, String(m));
  assert.equal(PESTANAS.length, 4); assert.equal(PASOS.length, 4);
});

test('medición: `cambio/<pestaña>` se agrega a uno por pestaña por minuto; el resto no', () => {
  const r = reloj(1000), med = crearMedidor({ ahora: r.ahora });
  assert.equal(med.evento('cambio/cara'), true);
  assert.equal(med.evento('cambio/cara'), false, 'segundo cambio en la misma pestaña, mismo minuto');
  assert.equal(med.evento('cambio/pelo'), true, 'otra pestaña cuenta aparte');
  r.avanzar(VENTANA_CAMBIO_MS - 1); assert.equal(med.evento('cambio/cara'), false, 'a 59,999 s todavía no');
  r.avanzar(1); assert.equal(med.evento('cambio/cara'), true, 'al minuto exacto vuelve a contar');
  assert.equal(med.evento('deshacer'), true); assert.equal(med.evento('deshacer'), true, 'deshacer no se agrega');
  assert.equal(med.evento('preset/grabador'), true); assert.equal(med.evento('preset/grabador'), true);
  assert.deepEqual(med.registro, ['cambio/cara', 'cambio/pelo', 'cambio/cara', 'deshacer', 'deshacer', 'preset/grabador', 'preset/grabador']);
});

test('medición: probar, listo y fps-bajo cuentan una vez por sesión', () => {
  const med = crearMedidor();
  for (const n of ['probar', 'listo', 'fps-bajo']) { assert.equal(med.evento(n), true, n); assert.equal(med.evento(n), false, n + ' repetido'); }
  assert.deepEqual(med.registro, ['probar', 'listo', 'fps-bajo']);
});

test('medición: hitos de cuenta (PR-D2): hito/* y hito-cuenta/visto/* una vez; entendido y abrir cuentan cada vez; otros nombres no', () => {
  const med = crearMedidor();
  for (const b of ['hito/navegador', 'hito/listo', 'hito/guardado', 'hito/probado', 'hito/vuelve', 'hito-cuenta/visto/listo', 'hito-cuenta/entendido/navegador', 'hito-cuenta/abrir/probado']) assert.equal(nombreValido(b), b, b);
  for (const m of ['hito', 'hito/otro', 'hito/listo/2', 'hito-cuenta/visto', 'hito-cuenta/cerrar/listo', 'hito-cuenta/abrir/x', 'cuenta/listo/abrir']) assert.equal(nombreValido(m), null, m);
  assert.equal(med.evento('hito/listo'), true); assert.equal(med.evento('hito/listo'), false, 'el hito se alcanza una vez por sesión');
  assert.equal(med.evento('hito-cuenta/visto/listo'), true); assert.equal(med.evento('hito-cuenta/visto/listo'), false);
  assert.equal(med.evento('hito-cuenta/abrir/listo'), true); assert.equal(med.evento('hito-cuenta/abrir/listo'), true, 'abrir la hoja puede repetirse');
  assert.equal(med.evento('hito-cuenta/entendido/listo'), true);
});

test('medición: la cola guarda hasta 200, descarta los más viejos y se vacía al enviar; nombres inválidos no entran', () => {
  const med = crearMedidor();
  assert.equal(med.evento('nada/de/esto'), false); assert.equal(med.cola.length, 0);
  for (let i = 0; i < MAX_COLA + 25; i++) med.evento('deshacer');
  med.evento('gusto/si');
  assert.equal(med.cola.length, MAX_COLA); assert.equal(med.registro.length, MAX_COLA);
  assert.equal(med.cola[MAX_COLA - 1], 'gusto/si', 'el último siempre se conserva');
  const enviados = med.vaciar();
  assert.equal(enviados.length, MAX_COLA); assert.equal(med.cola.length, 0); assert.deepEqual(med.vaciar(), []);
  assert.equal(med.registro.length, MAX_COLA, 'el registro no se vacía: sirve para depurar');
  assert.ok(!enviados.some(e => e.includes('{') || e.includes('#')), 'nunca viaja un look ni un color');
});

test('medición: con `?interno=1` no se registra ni se encola nada, y la marca queda en el almacén', () => {
  const st = memoria();
  assert.equal(esInterno('?interno=1', st), true); assert.equal(st.mapa.get(CLAVE_INTERNO), 't');
  assert.equal(esInterno('', st), true, 'la marca persiste en visitas siguientes sin parámetro');
  assert.equal(esInterno('?interno=0', st), false); assert.equal(st.mapa.has(CLAVE_INTERNO), false);
  assert.equal(esInterno('?x=1', memoria()), false);
  for (const [s, v] of [['?interno=1', true], ['?interno=si', true], ['?interno=true', true], ['?interno=0', false], ['?interno=no', false], ['?interno=false', false], ['?interno=2', null], ['', null], ['?otro=1', null]]) assert.equal(banderaInterna(s), v, s);
  const roto = memoria({ roto: true });
  assert.equal(esInterno('?interno=1', roto), true, 'almacén bloqueado: la URL manda en esta visita');
  assert.equal(esInterno('', roto), false, 'almacén bloqueado sin bandera: se cuenta (no sabemos que es interno)');
  assert.equal(esInterno('', null), false);
  const med = crearMedidor({ activo: false });
  for (const n of ['abrir/directo', 'preset/grabador', 'listo']) assert.equal(med.evento(n), false, n);
  assert.deepEqual(med.registro, []); assert.deepEqual(med.cola, []); assert.equal(med.activo, false);
});

test('medición: segundos redondeados a 10 con tope de una hora; nombre de abandono por paso', () => {
  for (const [s, r] of [[0, 0], [4, 0], [5, 10], [14, 10], [15, 20], [44.9, 40], [45, 50], [119, 120], [3599, 3600], [99999, MAX_SEGUNDOS], [-3, 0], [NaN, 0], ['abc', 0], [null, 0]]) assert.equal(redondear10(s), r, String(s));
  assert.equal(nombreAbandono(1, 43_000), 'abandono/personaje/40');
  assert.equal(nombreAbandono(0, 2_000), 'abandono/partida/0');
  assert.equal(nombreAbandono(2, 125_000), 'abandono/escenario/130');
  assert.equal(nombreAbandono(3, 7_200_000), 'abandono/listo/3600');
  assert.equal(nombreAbandono(9, 1000), 'abandono/partida/0', 'pantalla desconocida → partida');
  for (const p of [0, 1, 2, 3]) assert.ok(nombreValido(nombreAbandono(p, 61_000)), 'lo que genera siempre es válido');
});

test('medición: rastreadores, headless y webdriver no cuentan; personas sí', () => {
  assert.equal(esAutomatico('Mozilla/5.0 (compatible; Googlebot/2.1)'), true);
  assert.equal(esAutomatico('Mozilla/5.0 (X11) HeadlessChrome/130.0'), true);
  assert.equal(esAutomatico('WhatsApp/2.23'), true);
  assert.equal(esAutomatico('Mozilla/5.0 (Linux; Android 13) Chrome/130 Mobile Safari/537.36', true), true, 'webdriver manda');
  assert.equal(esAutomatico('Mozilla/5.0 (Linux; Android 13) Chrome/130 Mobile Safari/537.36'), false);
  assert.equal(esAutomatico('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1'), false);
  assert.equal(esAutomatico(''), false); assert.equal(esAutomatico(undefined), false);
});

test('medición: la forma para GoatCounter es la misma de AnalyticsService (path = title, event: true)', () => {
  assert.deepEqual(paraGoatCounter('listo'), { path: 'taps/disenador/listo', title: 'taps/disenador/listo', event: true });
  assert.match(paraGoatCounter('abandono/personaje/40').path, /^taps\/[a-z0-9/-]+$/, 'minúsculas, sin tildes, con guiones');
});

test('medición (PR-D3): invertido/5 es válido y cuenta una vez por sesión', () => {
  assert.equal(nombreValido('invertido/5'), 'invertido/5'); assert.equal(nombreValido('invertido/4'), null); assert.equal(nombreValido('invertido'), null);
  const med = crearMedidor();
  assert.equal(med.evento('invertido/5'), true); assert.equal(med.evento('invertido/5'), false);
});
