#!/usr/bin/env node
// Regenera public/taps-engine/themes/aventura/vendor/three-gltf.js (three.js + GLTFLoader) con versiones
// fijas, sin tocar el package.json del proyecto: instala three y esbuild en una carpeta temporal y empaqueta
// three-gltf.entry.mjs como script clásico (IIFE) que deja `globalThis.TapsThree` (el motor lo carga como `vendor`).
//
//   node projects/main/scripts/vendor/construir-three.mjs
//
// Al cambiar la versión: actualiza THREE aquí, regenera, revisa las capturas del tema «aventura» y sube TAPS_ENGINE_VERSION.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const THREE = '0.186.1', ESBUILD = '0.28.2';
const AQUI = dirname(fileURLToPath(import.meta.url));
const DESTINO = join(AQUI, '../../public/taps-engine/themes/aventura/vendor');
const tmp = mkdtempSync(join(tmpdir(), 'three-gltf-'));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
try {
  writeFileSync(join(tmp, 'package.json'), '{"private":true}');
  execFileSync(npm, ['install', '--no-audit', '--no-fund', `three@${THREE}`, `esbuild@${ESBUILD}`], { cwd: tmp, stdio: 'inherit', shell: process.platform === 'win32' });
  copyFileSync(join(AQUI, 'three-gltf.entry.mjs'), join(tmp, 'entry.mjs'));
  const { build, stop } = await import(new URL(`file:///${join(tmp, 'node_modules/esbuild/lib/main.js').replace(/\\/g, '/')}`).href);
  await build({ entryPoints: [join(tmp, 'entry.mjs')], bundle: true, minify: true, format: 'iife', globalName: 'TapsThree', target: 'es2020',
    legalComments: 'eof', outfile: join(DESTINO, 'three-gltf.js'), banner: { js: `/* three.js r${THREE.split('.')[1]} (MIT) + GLTFLoader · ver LICENSE-three.txt */` } });
  copyFileSync(join(tmp, 'node_modules/three/LICENSE'), join(DESTINO, 'LICENSE-three.txt'));
  stop?.();
  console.log(`three-gltf.js: three ${THREE} → ${DESTINO}`);
} finally {
  try { rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { console.warn(`No se pudo borrar ${tmp} (bórralo a mano).`); }
}
