// Variedad de la música de fondo con el feed real (sin navegador). Ejecutar:  node --test projects/main/taps-engine-tests/*.mjs
// Toma el orden de verdad del feed (taps.logic.ts → orderFeed sobre el banco generado; se compila con esbuild en memoria)
// y encadena la elección de taps-engine/audio/musica.js como lo hace el reproductor: cada Tap recibe la pista del anterior.
// Supone que cada Tap dura más de 20 s (5 preguntas), así que la regla de permanencia no entra en juego.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const TAPS_DIR = fileURLToPath(new URL('../src/app/taps/', import.meta.url));
const { pistaPara } = await import(new URL('../public/taps-engine/audio/musica.js', import.meta.url).href);
const manifiesto = JSON.parse(readFileSync(new URL('../public/taps-musica/musica.json', import.meta.url), 'utf8'));

const salida = await build({
  stdin: { contents: "export { TAPS, TAP_TOPICS } from './taps.data'; export { orderFeed, topicOf } from './taps.logic';", resolveDir: TAPS_DIR, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'neutral', write: false, logLevel: 'silent',
});
const { TAPS, TAP_TOPICS, orderFeed, topicOf } = await import(`data:text/javascript;base64,${Buffer.from(salida.outputFiles[0].text).toString('base64')}`);

/** Las pistas que suenan en una lista de Taps, encadenando la anterior. */
function pistas(lista) {
  let anterior = null;
  return lista.map(t => (anterior = pistaPara(manifiesto.mapa, { id: t.id, mundo: t.scene.world, tema: topicOf(t), motor: t.theme }, anterior)));
}

/** El mapa anterior (una pista por mundo; si no, por tema): solo para comparar en el informe. */
const ANTES = {
  mundos: { cueva: 'cave-quiz-crawl', noche: 'cave-quiz-crawl', nether: 'magma-quest-loop', end: 'magma-quest-loop', aldea: 'village-morning-loop', casa: 'village-morning-loop', playa: 'island-quiz-loop', espacio: 'orbit-quiz-drift', observatorio: 'orbit-quiz-drift', biblioteca: 'cozy-study-loop' },
  temas: { minecraft: 'pixel-quest-loop', logica: 'puzzle-tick-loop', cultura: 'wonder-loop' },
};
const antes = lista => lista.map(t => (topicOf(t) === 'logica' ? ANTES.temas.logica : ANTES.mundos[t.scene.world] ?? ANTES.temas[topicOf(t)] ?? 'cozy-study-loop'));

const casos = [
  ['Para ti (primera visita)', orderFeed(TAPS, { hookDone: false })],
  ['Para ti (ya jugó el gancho)', orderFeed(TAPS, { hookDone: true })],
  ...TAP_TOPICS.map(c => [c.name, orderFeed(TAPS, { topic: c.id }).filter(t => topicOf(t) === c.id)]),
];

test('variedad: pistas distintas en los primeros 10 Taps, sin repetir la del Tap anterior', () => {
  const filas = [];
  for (const [nombre, lista] of casos) {
    const diez = lista.slice(0, 10), ahora = pistas(diez);
    for (let i = 1; i < ahora.length; i++) assert.notEqual(ahora[i], ahora[i - 1], `${nombre}: Tap ${i + 1} repite la pista del anterior`);
    const distintas = new Set(ahora).size, previas = new Set(antes(diez)).size;
    filas.push(`${nombre.padEnd(28)} ${String(distintas).padStart(2)} distintas (antes ${previas})  ${ahora.join(', ')}`);
    assert.ok(distintas >= 3, `${nombre}: solo ${distintas} pistas distintas`);
    assert.ok(distintas >= previas, `${nombre}: menos variedad que antes`);
  }
  console.log(`\nMúsica en los primeros 10 Taps:\n${filas.join('\n')}\n`);
  const [, paraTi] = casos[0];
  assert.ok(new Set(pistas(paraTi.slice(0, 10))).size >= 5, '«Para ti» mezcla al menos 5 pistas en 10 Taps');
  const minecraft = casos.find(([n]) => n === 'Minecraft')[1];
  assert.ok(new Set(pistas(minecraft.slice(0, 10))).size >= 4, 'Minecraft usa al menos 4 de sus 5 pistas en 10 Taps');
});
