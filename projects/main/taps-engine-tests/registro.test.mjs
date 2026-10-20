// Pruebas del registro de personajes y fondos (public/taps-engine/personajes, fondos y registro.js). Sin navegador.
// Revisan que cada manifiesto sea válido, que sus archivos existan y pesen poco, que cada clip mapeado esté de verdad en el
// .glb, que todo lo importado tenga su licencia en ATRIBUCIONES.md y que la elección por Tap sea determinista y variada.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';

const ENGINE = new URL('../public/taps-engine/', import.meta.url);
const R = await import(new URL('registro.js', ENGINE).href);
const readJson = url => JSON.parse(readFileSync(url, 'utf8'));
const carpetas = sub => readdirSync(new URL(sub, ENGINE), { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
const PERSONAJES = carpetas('personajes/'), FONDOS = carpetas('fondos/');
const THEMES = readdirSync(new URL('themes/', ENGINE)).filter(id => existsSync(new URL(`themes/${id}/theme.json`, ENGINE)))
  .map(id => readJson(new URL(`themes/${id}/theme.json`, ENGINE)));
const KB = 1024;

/** JSON de un .glb (primer bloque): animaciones, extensiones e imágenes, sin decodificar las mallas. */
function glbJson(url) {
  const b = readFileSync(url);
  assert.equal(b.toString('utf8', 0, 4), 'glTF', 'cabecera glTF');
  return JSON.parse(b.toString('utf8', 20, 20 + b.readUInt32LE(12)));
}

test('registro: hay al menos 6 personajes y 6 fondos, y cada uno lo usa algún tema', () => {
  assert.ok(PERSONAJES.length >= 6, `personajes: ${PERSONAJES.length}`);
  assert.ok(FONDOS.length >= 6, `fondos: ${FONDOS.length}`);
  const usados = new Set(THEMES.flatMap(t => [...(t.personajes ?? []), ...(t.fondos ?? [])]));
  for (const id of [...PERSONAJES, ...FONDOS]) assert.ok(usados.has(id), `«${id}» no está en ningún theme.json (personajes/fondos)`);
  for (const t of THEMES) {
    for (const id of t.personajes ?? []) assert.ok(PERSONAJES.includes(id), `${t.id}: el personaje «${id}» no tiene carpeta`);
    for (const id of t.fondos ?? []) assert.ok(FONDOS.includes(id), `${t.id}: el fondo «${id}» no tiene carpeta`);
  }
});

for (const id of PERSONAJES) {
  test(`personaje «${id}»: manifiesto válido, archivos livianos y clips que existen`, () => {
    const url = R.urlPersonaje(id, ENGINE), m = readJson(url);
    assert.deepEqual(R.validarPersonaje(m, id), []);
    const archivo = new URL(m.archivo, url);
    assert.ok(existsSync(archivo), `existe ${m.archivo}`);
    if (m.miniatura) {
      const mini = new URL(m.miniatura, url);
      assert.ok(existsSync(mini), `existe ${m.miniatura}`);
      assert.ok(statSync(mini).size < 60 * KB, `${m.miniatura} pesa menos de 60 KB`);
    }
    if (m.tipo === 'glb') {
      assert.ok(statSync(archivo).size < 300 * KB, `${m.archivo} pesa ${(statSync(archivo).size / KB) | 0} KB (máximo 300)`);
      const g = glbJson(archivo), clips = new Set((g.animations ?? []).map(a => a.name));
      for (const [reaccion, clip] of Object.entries(m.animaciones)) {
        assert.ok(R.REACCIONES.includes(reaccion), `reacción desconocida «${reaccion}»`);
        assert.ok(clips.has(clip), `animaciones.${reaccion} = «${clip}», pero el .glb solo trae ${[...clips].join(', ')}`);
      }
      assert.ok(!(g.images ?? []).some(i => i.uri), 'las texturas van dentro del .glb (sin archivos sueltos)');
      // meshopt y Draco necesitan WebAssembly, que la CSP (script-src sin 'wasm-unsafe-eval') bloquea: el .glb no cargaría
      for (const ext of g.extensionsRequired ?? []) assert.ok(['KHR_mesh_quantization', 'KHR_materials_unlit', 'KHR_texture_transform'].includes(ext), `extensión ${ext}: no la decodifica el cargador sin WebAssembly`);
    }
  });
}

for (const id of FONDOS) {
  test(`fondo «${id}»: manifiesto válido e imagen liviana`, () => {
    const url = R.urlFondo(id, ENGINE), m = readJson(url);
    assert.deepEqual(R.validarFondo(m, id), []);
    if (m.archivo) {
      const img = new URL(m.archivo, url);
      assert.ok(existsSync(img), `existe ${m.archivo}`);
      assert.ok(statSync(img).size < 200 * KB, `${m.archivo} pesa ${(statSync(img).size / KB) | 0} KB (máximo 200)`);
    }
  });
}

test('atribuciones: cada personaje y fondo aparece en ATRIBUCIONES.md con su fuente y licencia', () => {
  const md = readFileSync(new URL('ATRIBUCIONES.md', ENGINE), 'utf8');
  for (const [sub, ids, url] of [['personaje', PERSONAJES, R.urlPersonaje], ['fondo', FONDOS, R.urlFondo]]) for (const id of ids) {
    const m = readJson(url(id, ENGINE));
    assert.ok(md.includes(`\`${id}\``), `ATRIBUCIONES.md no menciona el ${sub} «${id}»`);
    assert.ok(md.includes(m.licencia.fuente), `ATRIBUCIONES.md no enlaza la fuente de «${id}» (${m.licencia.fuente})`);
  }
});

test('validación: rechaza licencias no comerciales, clips sin mapear y colores mal escritos', () => {
  const base = { nombre: 'X', tipo: 'glb', archivo: 'a.glb', miniatura: 'a.png', animaciones: { idle: 'i', pensar: 'i', acierto: 'a', fallo: 'f', hablar: 'h', celebrar: 'c' },
    licencia: { nombre: 'CC0 1.0', url: 'u', autor: 'a', fuente: 'f' } };
  assert.deepEqual(R.validarPersonaje(base, 'x'), []);
  assert.ok(R.validarPersonaje({ ...base, licencia: { ...base.licencia, nombre: 'CC BY-NC 4.0' } }, 'x').some(e => /comercial/.test(e)));
  assert.ok(R.validarPersonaje({ ...base, licencia: { ...base.licencia, nombre: 'Solo uso personal' } }, 'x').length > 0);
  assert.ok(R.validarPersonaje({ ...base, animaciones: { idle: 'i' } }, 'x').some(e => /pensar/.test(e)));
  assert.ok(R.validarPersonaje({ ...base, tipo: 'fbx' }, 'x').some(e => /tipo/.test(e)));
  assert.ok(R.validarPersonaje(base, 'Mal Id').some(e => /kebab/.test(e)));
  const fondo = { nombre: 'F', tipo: 'imagen', archivo: 'f.png', cielo: ['#000000', '#ffffff'], suelo: '#123456', licencia: base.licencia };
  assert.deepEqual(R.validarFondo(fondo, 'f'), []);
  assert.ok(R.validarFondo({ ...fondo, cielo: ['azul', '#fff'] }, 'f').some(e => /cielo/.test(e)));
  assert.ok(R.validarFondo({ ...fondo, tipo: 'color', archivo: undefined }, 'f').length === 0, 'un fondo de color no necesita imagen');
});

test('expandirTema: convierte manifiestos, no pisa lo escrito a mano y salta los rotos sin romper el tema', async () => {
  const files = {
    'personajes/bien/personaje.json': { nombre: 'Bien', tipo: 'glb', archivo: 'm.glb', miniatura: 'm.png', animaciones: { idle: 'i', pensar: 'i', acierto: 'a', fallo: 'f', hablar: 'h', celebrar: 'c' }, licencia: { nombre: 'CC0', url: 'u', autor: 'a', fuente: 'f' } },
    'personajes/roto/personaje.json': { nombre: 'Roto', tipo: 'glb' },
    'personajes/skin/personaje.json': { nombre: 'Skin', tipo: 'skin-blocky', archivo: 'skin.png', slim: true, licencia: { nombre: 'CC-BY 4.0', url: 'u', autor: 'a', fuente: 'f' } },
    'fondos/playa/fondo.json': { nombre: 'Playa', tipo: 'imagen', archivo: 'p.png', cielo: ['#000000', '#111111'], suelo: '#222222', licencia: { nombre: 'CC0', url: 'u', autor: 'a', fuente: 'f' } },
  };
  const base = new URL('https://ejemplo.test/taps-engine/');
  const leer = async u => { const k = u.href.slice(base.href.length); if (!files[k]) throw new Error('404'); return files[k]; };
  const theme = { id: 't', defaultWorld: 'no-existe', characters: { bien: { name: 'A mano' } }, personajes: ['skin', 'bien', 'roto', 'falta'], fondos: ['playa'] };
  const warn = console.warn; console.warn = () => {};
  const { theme: t, errores } = await R.expandirTema(theme, { leer, base });
  console.warn = warn;
  assert.equal(t.characters.bien.name, 'A mano', 'no pisa un personaje escrito a mano');
  assert.equal(t.characters.skin.skin, 'https://ejemplo.test/taps-engine/personajes/skin/skin.png', 'skin-blocky deja la skin con ruta absoluta (la usa minecraft)');
  assert.equal(t.characters.skin.slim, true);
  assert.deepEqual(Object.keys(t.characters), ['skin', 'bien'], 'el orden del theme.json manda; los rotos se saltan');
  assert.equal(errores.length, 2);
  assert.equal(t.scenes.playa.imagen, 'https://ejemplo.test/taps-engine/fondos/playa/p.png');
  assert.deepEqual(t.scenes.playa.sky, ['#000000', '#111111']);
  assert.equal(t.defaultWorld, 'playa', 'defaultWorld cae al primer fondo si no existe');
});

test('elegirParaTap: determinista, sin repetir personaje ni fondo entre Taps seguidos y recorriendo todos', () => {
  const ps = ['a', 'b', 'c', 'd'], fs = ['1', '2', '3', '4', '5', '6'];
  const L = Array.from({ length: 24 }, (_, i) => R.elegirParaTap(i, ps, fs));
  assert.deepEqual(L, Array.from({ length: 24 }, (_, i) => R.elegirParaTap(i, ps, fs)));
  L.forEach((e, i) => { if (i) { assert.notEqual(e.host, L[i - 1].host); assert.notEqual(e.world, L[i - 1].world); } });
  assert.equal(new Set(L.map(e => e.host)).size, 4);
  assert.equal(new Set(L.map(e => e.world)).size, 6);
  assert.ok(new Set(L.map(e => e.host + e.world)).size >= 12, 'muchas parejas distintas');
  assert.throws(() => R.elegirParaTap(0, [], fs));
});

test('ANIM_A_REACCION cubre las animaciones que piden las reacciones de todos los temas con registro', () => {
  for (const t of THEMES.filter(x => x.personajes)) for (const [name, r] of Object.entries(t.reactions)) {
    assert.ok(R.ANIM_A_REACCION[r.anim], `${t.id}.${name}: la animación «${r.anim}» no tiene reacción del registro`);
  }
});

test('expandirTema: con registro.json abrir un tema cuesta UNA petición; lo que no esté en el índice se pide suelto', async () => {
  const indice = readJson(R.urlIndice(ENGINE));
  const theme = readJson(new URL('themes/aventura/theme.json', ENGINE));
  const pedidas = [];
  const leer = async u => { pedidas.push(u.href); if (u.href.endsWith('registro.json')) return indice; return readJson(u); };
  const { theme: t, errores } = await R.expandirTema(theme, { leer, base: ENGINE });
  assert.deepEqual(errores, []);
  assert.equal(pedidas.length, 1, `pidió ${pedidas.length}: ${pedidas.join(', ')}`);
  assert.equal(Object.keys(t.characters).length, theme.personajes.length);
  assert.ok(t.characters.zorro.modelo.endsWith('/personajes/zorro/modelo.glb'), 'rutas absolutas como si viniera del manifiesto suelto');
  const sinIndice = { ...readJson(new URL('themes/aventura/theme.json', ENGINE)) }; pedidas.length = 0;
  await R.expandirTema(sinIndice, { leer: async u => { pedidas.push(u.href); if (u.href.endsWith('registro.json')) throw new Error('404'); return readJson(u); }, base: ENGINE });
  assert.equal(pedidas.length, 1 + theme.personajes.length + theme.fondos.length, 'sin índice: uno por manifiesto');
});
