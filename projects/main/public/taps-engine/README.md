# Taps Engine

Motor de escenarios en tiempo real para los **Taps** de GEMS («reels que juegas»): un personaje 3D que te pregunta,
reacciona a lo que respondes, suelta partículas y sonido. No es video: se dibuja en vivo en el navegador.

El motor **no sabe nada de quizzes ni del LMS**. Solo sabe de un *escenario* (mundo + personaje) que puede mover,
hacer hablar y hacer reaccionar. El quiz, el feed y la medición viven en la app (`src/app/taps/`). Para cambiar de
videojuego se cambia el **tema**; para crear un Tap nuevo se agrega un archivo de datos.

```
public/taps-engine/
├─ taps-engine.js            motor (módulo ES, sin dependencias): capas, bucle, partículas, sonido, degradación
├─ taps-engine.css           estilos de la capa ligera y del globo de diálogo (usan variables --te-* del tema)
├─ demo.html                 demo estática: un quiz de 40 líneas manejando el motor  (…/taps-engine/demo.html?tap=redstone&debug)
├─ taps/*.json               Taps de ejemplo en formato de datos (los usa la demo)
└─ themes/
   └─ minecraft/             un tema = un videojuego
      ├─ theme.json          datos: personajes, mundos, colores, sonidos, reacciones, cámara
      ├─ light.js            dibuja el personaje 2D de la capa ligera
      ├─ renderer3d.js       el ÚNICO archivo que sabe de Minecraft (skinview3d / three.js)
      └─ vendor/ skins/ textures/ textures-pp/ sounds/ fonts/
```

## Cómo funciona (dos capas)

| Capa | Qué es | Cuándo se ve |
|---|---|---|
| **Ligera** | DOM + CSS: fondo de bloques, personaje 2D hecho con el PNG de la skin, animaciones CSS, globo de diálogo | De inmediato (solo necesita `theme.json`, ~3 KB). Es lo único que ve quien tiene un dispositivo flojo, ahorro de datos o WebGL caído |
| **3D** | `<canvas>`: el renderizador del tema. Se carga en segundo plano y aparece con un fundido encima de la ligera | Cuando termina de cargar (~0,3-1 s en un celular normal) |

Nunca hay pantalla en blanco ni error: si el 3D falla se queda la capa ligera (evento `mode` con `reason`).

**Decisión de calidad** (`pickTier`): `light` si `navigator.connection.saveData`, red 2G, `deviceMemory <= 1` o `hardwareConcurrency <= 2`;
`low` (360×640, 24 fps) si `deviceMemory <= 3`; `normal` (540×960, 30 fps) en celulares; `high` (720×1280, 30 fps) en escritorio.
Además **se degrada solo**: si en una ventana de ~3 s el promedio queda por debajo de la mitad del tope, baja a 360×640 y, si sigue mal, pasa a la capa ligera.

Otros cuidados: pausa fuera de pantalla y con la pestaña oculta (`pause()`/`resume()`, `visibilitychange`), tope de fps, `prefers-reduced-motion`
(sin partículas, sin sacudidas, sin saltos; el 3D solo se dibuja un instante tras cada cambio), cede el hilo principal durante el arranque del 3D, y
carga solo los assets del escenario activo (las texturas de bloques se piden por mundo, no las 40 de golpe).

## API del escenario

```js
import { create } from '/taps-engine/taps-engine.js';

const stage = create(contenedor, { theme: '/taps-engine/themes/minecraft/theme.json' }); // síncrono
await stage.ready;                                   // tema cargado y capa ligera pintada
await stage.setScene({ world: 'cueva', host: 'sofi', item: 'pick' });
stage.react('ask');                                  // reacción definida en theme.reactions
stage.say('¡Hola!');                                 // globo de diálogo (stage.say('') lo oculta)
```

| Miembro | Qué hace |
|---|---|
| `create(container, {theme, mode?, reducedMotion?, onEvent?})` | Crea el escenario dentro de `container` (que debe tener tamaño). `theme`: URL del `theme.json` u objeto. `mode`: `'auto'` (defecto), `'3d'` o `'light'`. `degrade: false` desactiva la degradación automática (útil para medir/capturar en equipos sin GPU; la demo lo toma de `?degrade=0`) |
| `stage.ready` / `stage.ready3d` | `ready`: tema listo. `ready3d`: se cumple con `'3d'` o `'light'` cuando ya se decidió |
| `stage.mode`, `stage.stats()` | Modo actual y `{mode, tier, size, fpsCap, fps, degraded}` |
| `setScene({world, host, item})` | Cambia mundo, personaje y objeto en la mano (claves del tema) |
| `preload(sceneSpec)` | Deja listo, sin mostrar, el siguiente escenario (llamar en reposo) |
| `react(name)` | Anim + efecto + sonido + partículas + frase de `theme.reactions[name]` |
| `say(text, {ms, hold, tone})` | Globo sobre la cabeza |
| `pause()` / `resume()` | Detiene/reanuda el dibujo (el feed lo usa fuera de pantalla) |
| `attachTo(el)` | Mueve el escenario entero a otro contenedor (el feed usa **un** escenario para todos los Taps) |
| `setMuted(bool)`, `sfx(name)` | Sonido (el audio arranca tras el primer gesto del usuario) |
| `on('mode' \| 'degrade', fn)` | Eventos: `{mode, reason, tier}` / `{step}` |
| `destroy()` | Libera todo (incluido el contexto WebGL) |

## Agregar un tema (otro videojuego)

1. Copia `themes/minecraft` a `themes/<id>` y edita `theme.json`.
2. **Campos de `theme.json`**
   - `renderer`: ruta del renderizador 3D (opcional: sin él el tema es solo capa ligera). `vendor`: scripts globales que necesita (se cargan antes, mismo origen por la CSP).
   - `light`: módulo con `paintCharacter(canvas, imagenDeLaSkin, opciones)` para el personaje 2D (opcional).
   - `characters`: `{ clave: { name, skin, slim? } }`. `defaultWorld`. `scenes`: colores CSS del fondo de la capa ligera por mundo (`sky:[arriba,abajo]`, `ground`, `groundDark`, `sun:false`).
   - `palette`: colores (`accent`, `good`, `bad`) y listas de partículas (`confetti`, `hit`, `poof`). Se exponen como variables `--te-*`.
   - `sounds`: `{ nombre: { files:[…], vol, synth } }`. `synth` es el sonido sintetizado que se usa si el navegador no decodifica el archivo (p. ej. `.ogg` en Safari). El motor trae sintetizados `jingle`, `wrong`, `blip`, `crit`, `pop`, `whoosh`, `result`.
   - `reactions`: `{ nombre: { anim, reducedAnim, fx:[…], sfx:[…], particles, say:[frases], tone, duration, then } }`. Sin `duration` la animación se repite hasta la siguiente reacción; con `duration` pasa a `then`.
   - `camera`: `dist`, `height`, `lookY`, `sway`, `swaySpeed` y `worlds: { mundo: {…} }` para ajustes por mundo.
   - `font`: `{ family, src }` (se carga con `font-display: swap`, nunca bloquea).
3. **Interfaz del renderizador** (`renderer3d.js` exporta `createRenderer(opts)`): recibe `{canvas, width, height, theme, resolve, skinview3d, reducedMotion}`, donde `canvas` es el lienzo 2D de salida (el renderizador dibuja ahí cada fotograma) y `resolve(rel)` convierte rutas del tema en URLs. Devuelve:
   `setScene({world,host,item})`, `preload(spec)`, `play(anim)`, `fx(name)`, `frame(dt)`, `anchor('head'|'top'|'chest'|'feet') → [px, py]`, `setSize(w,h)`, `dispose()`.
   El motor llama `frame(dt)` a su ritmo; todo lo demás (partículas, globo, sonido, fps, pausa, degradación) ya está resuelto afuera.
   Un juego sin 3D puede dejar solo `light.js` + `theme.json` y funcionará siempre en modo ligero.
4. Para usarlo en un Tap: `theme: '<id>'` y una `scene` con claves de ese tema. **No se toca el motor.**

## Agregar un Tap

Un Tap es un objeto de datos (tipos en `src/app/taps/taps.types.ts`; ejemplos en `taps/*.json` y `src/app/taps/taps.data.ts`):

```jsonc
{
  "id": "redstone",
  "theme": "minecraft",
  "title": "Redstone", "kicker": "Quiz de bloques",
  "scene": { "world": "cueva", "host": "sofi", "item": "pick" },
  "backdrop": ["#0b0a09", "#3a322b"],                 // degradado mientras carga (solo en la app)
  "questions": [{ "id": "piston", "q": "…", "options": ["…"], "answer": 2, "why": "Explicación corta." }],
  "results": [                                         // se elige el de mayor `min` que no supere los aciertos
    { "min": 0, "title": "Aprendiz de antorchas", "line": "…" },
    { "min": 5, "title": "Crack de redstone", "line": "…" }
  ]
}
```

En la app: agrega el objeto a `TAPS` en `taps.data.ts` (las preguntas pueden salir del banco existente por id con `fromBank`). El test
`taps.logic.spec.ts` valida el formato de todos los Taps (respuesta dentro de las opciones, resultados desde 0 aciertos, ids únicos…).

## Notas de despliegue

- Son archivos estáticos del mismo origen (la CSP `script-src 'self'` los admite; `worker-src blob:`/`img-src data: blob:` ya existen). No hizo falta tocar la CSP.
- Los archivos de `public/` se sirven con `max-age=86400` y sin hash: al cambiar el motor sube `TAPS_ENGINE_VERSION` en `src/app/taps/taps-engine.loader.ts`
  (los archivos internos del tema se piden por URL relativa; si cambian de forma incompatible cambia también la query o el nombre).
- El servidor Node del SSR no comprime; el bundle de skinview3d (477 KB) baja a ~118 KB con gzip: conviene que el proxy (nginx/Cloudflare) comprima `.js`/`.json`.
- Sonidos `.ogg`: Safari antiguo no los decodifica en WebAudio; el motor cae al sonido sintetizado del tema. Convertir a `.m4a`/`.mp3` los dejaría idénticos en todos los navegadores.
- Licencias: texturas Pixel Perfection / Minetest Game (CC BY-SA, ver `textures*/LICENSE*`), sonidos Minetest Game, skinview3d (MIT), fuente Pixelify Sans (OFL).
  «No es un producto oficial de Minecraft. No está aprobado por Mojang ni Microsoft.»
