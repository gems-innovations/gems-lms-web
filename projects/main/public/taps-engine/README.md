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
├─ demo.html                 demo estática: un quiz de 50 líneas manejando el motor  (…/taps-engine/demo.html?tap=redstone&debug)
├─ taps/*.json               Taps de ejemplo en formato de datos (los usa la demo; ?tap=<id>)
├─ audio/                  efectos de sonido sintetizados por código (efectos.js, puro) y reproductor Web Audio (sonido.js)
├─ voz/                    voz de los personajes: perfiles por personaje, efectos de voz y motores (Web Speech, audios pregenerados, modelo local)
└─ themes/
   ├─ minecraft/             tema 1 · 3D con WebGL: personajes de bloques
   │  ├─ theme.json          datos: personajes, mundos, colores, sonidos, reacciones, cámara
   │  ├─ light.js            dibuja el personaje 2D de la capa ligera
   │  ├─ renderer3d.js       el ÚNICO archivo que sabe de Minecraft (skinview3d / three.js)
   │  ├─ visuals.js          objetos para explicar en estilo inventario (se piden solo al usarse)
   │  └─ vendor/ skins/ textures/ textures-pp/ sounds/ fonts/
   └─ estudio/               tema 2 · ilustración plana con Canvas 2D: robot Chispa/Nube en laboratorio, espacio y aula
      ├─ theme.json          datos (sin imágenes ni audio: colores, tonos sintetizados, reacciones)
      ├─ rig.js              el personaje: rig 2D (cuerpo, cabeza-pantalla, brazos, antena) + poses + objetos
      ├─ scenery.js          los ocho escenarios y sus decorados (se pintan una vez y se copian)
      ├─ visuals.js          objetos para explicar en estilo cuaderno (se piden solo al usarse)
      ├─ renderer2d.js       renderizador animado (misma interfaz que renderer3d.js, sin WebGL)
      ├─ light.js            el mismo rig, quieto, para la capa ligera (+ paintReaction)
      └─ theme.css           estilos de la capa ligera y del globo SOLO para este tema
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
| `create(container, {theme, mode?, reducedMotion?, onEvent?})` | Crea el escenario dentro de `container` (que debe tener tamaño). `theme`: URL del `theme.json` u objeto. `mode`: `'auto'` (defecto), `'3d'` o `'light'`. `degrade: false` desactiva la degradación automática (útil para medir/capturar en equipos sin GPU; la demo lo toma de `?degrade=0`). `slowMs` (4000 por defecto, `0` lo desactiva): si el 3D no se ve en ese tiempo se queda la capa ligera |
| `stage.ready` / `stage.ready3d` | `ready`: tema listo. `ready3d`: se cumple con `'3d'` o `'light'` cuando ya se decidió |
| `stage.mode`, `stage.stats()` | Modo actual y `{mode, tier, size, fpsCap, fps, degraded, canvas}`. `mode: '3d'` significa «capa animada del renderizador» aunque el tema dibuje en 2D; `canvas` dice cuál (`'webgl'` o `'2d'`) |
| `setScene({world, host, item, shot?, enter?, props?})` | Cambia mundo, personaje, objeto, encuadre, entrada y decorado (claves del tema; las que el tema no conoce se ignoran). Si cambia el lugar, el escenario se oculta al instante (queda el color plano del mundo nuevo) y vuelve con un fundido de 280 ms; con movimiento reducido el cambio es directo |
| `preload(sceneSpec)` | Deja listo, sin mostrar, el siguiente escenario (llamar en reposo) |
| `react(name)` | Anim + efecto + sonido + partículas + frase de `theme.reactions[name]` |
| `say(text, {ms, hold, tone, voz, globo})` | Globo sobre la cabeza. Con voz conectada (`setVoz`) también lo dice en voz alta con el perfil del personaje en escena; `voz: false` = solo globo, `globo: false` = solo voz |
| `setVoz(voz)` (o `null`) | Conecta una voz `{hablar(texto, personaje), callar()}` (p. ej. `crearVoz().paraMotor()` de `voz/voz.js`). Mientras habla, el personaje usa la animación `talk` |
| `pause()` / `resume()` | Detiene/reanuda el dibujo (el feed lo usa fuera de pantalla) |
| `attachTo(el)` | Mueve el escenario entero a otro contenedor (el feed usa **un** escenario para todos los Taps) |
| `setMuted(bool)`, `sfx(name)` | Sonido (el audio arranca tras el primer gesto del usuario) |
| `create(…, {audio})` | Opcional: `audio = {play(name, {theme})}` (p. ej. `crearSonido().paraMotor()` de `audio/sonido.js`). El motor no crea su propio AudioContext y le pasa cada sonido de `theme.json` por nombre; silencio, desbloqueo y pausa quedan en manos de la app. Así lo usa el feed: un solo AudioContext y efectos propios generados por código (ver `producto/taps/voz-y-sonido.md`) |
| `visual({objeto, accion, valor?}, el, {side?})` | Muestra un objeto para explicar dentro de `el` (el hueco lo pone la app). Carga `visuals.js` del tema la primera vez. Tocar repite la animación y arrastrar la recorre. `side` ('izq' / 'der') = dónde está el objeto: el personaje se corre a la mitad libre. Devuelve la descripción del objeto (la app la pone en el `aria-label` de su botón; el lienzo va con `aria-hidden`) o `false` si el tema no tiene ese objeto |
| `clearVisual()`, `replayVisual()`, `preloadVisuals()` | Quita el objeto (también al mover el escenario a otro Tap), lo repite (teclado) o pide el módulo en reposo |
| `on('mode' \| 'degrade' \| 'visual', fn)` | Eventos: `{mode, reason, tier}` / `{step}` / `{type: 'touch' \| 'drag'}` (la app pausa la cuenta atrás mientras se explora el objeto) |
| `destroy()` | Libera todo (incluido el contexto WebGL) |

## Cómo crear un tema

Un tema es una carpeta `themes/<id>/` con un `theme.json`. Hay dos ejemplos que conviene leer juntos porque son opuestos:

| | `minecraft` (tema 1) | `estudio` (tema 2) |
|---|---|---|
| Estilo | Bloques, píxeles, 3D | Ilustración plana, colores de GEMS |
| Capa animada | `renderer3d.js` con WebGL (skinview3d/three.js, ~118 KB gzip) | `renderer2d.js` con Canvas 2D, **sin librerías** (~16 KB gzip el tema entero) |
| Personaje | Skins PNG | Dibujado por código (`rig.js`): colores en `characters[id].look` |
| Sonidos | Archivos `.ogg` (+ sintetizado de respaldo) | Tonos sintetizados declarados en `theme.json` |
| Capa ligera | Personaje desde la skin | El mismo rig quieto; cambia la cara con cada reacción |

### Pasos

1. Crea `themes/<id>/theme.json` (copia el de `estudio` si tu tema es 2D o el de `minecraft` si es 3D).
2. Decide la capa animada:
   - **3D** (`renderer` + `vendor`): necesita WebGL; si no hay, el motor se queda en la capa ligera.
   - **2D** (`"canvas": "2d"` + `renderer`): no pide WebGL ni librerías. Recomendado para ilustración: pesa poco y no gasta el
     único contexto WebGL que iOS y los Android modestos toleran bien.
   - **Ninguna**: solo `light.js` + `theme.json`; siempre en modo ligero.
3. Escribe el renderizador (si hay) con la interfaz de abajo, el `light.js` y, si hace falta, un `theme.css`.
4. Agrega reacciones con al menos `idle`, `think`, `ask`, `celebrate`, `hurt`, `win`, `lose` (la app y la demo usan esas).
5. Pon un Tap de prueba en `taps/<id>.json` y ábrelo en `demo.html?tap=<id>&debug`; prueba también `&mode=light` y `&reduced=1`.
   `&world=…&host=…&item=…` cambian la escena sin tocar el archivo.
6. `node --test projects/main/taps-engine-tests/*.mjs` revisa el contrato de **todos** los temas (reacciones que apuntan a
   animaciones, sonidos y partículas que existen, archivos referenciados, escenas de los Taps de ejemplo).
7. Para usarlo en la app: `theme: '<id>'` y una `scene` con claves de ese tema. **No se toca el motor.**

### Campos de `theme.json`

- `id` (igual a la carpeta; el motor lo pone en `data-theme` del escenario), `name`, `version`.
- `renderer`: módulo de la capa animada (opcional). `vendor`: `{ nombreGlobal: ruta }` scripts clásicos que se cargan antes (mismo origen
  por la CSP) y llegan al renderizador en `opts.vendor` (y `opts.skinview3d`, por compatibilidad).
- `canvas`: `"2d"` si el renderizador dibuja con Canvas 2D (no se comprueba WebGL ni se exige `vendor`). Sin el campo: WebGL. *(nuevo, opcional)*
- `light`: módulo de la capa ligera: `paintCharacter(canvas, imagenDeLaSkin | null, opciones)` y, opcional, `paintReaction(canvas, anim, opciones)`,
  que el motor llama en cada reacción en modo ligero (con movimiento reducido recibe `reducedAnim`). `opciones` = `{ id, character, item, world, theme, slim }`.
- `css`: hoja de estilos del tema (opcional), cargada una vez sin bloquear. Debe limitarse a `.te-stage[data-theme='<id>']`. *(nuevo)*
- `characters`: `{ clave: { name, skin?, slim?, look? } }`. `skin` es opcional: un tema dibujado por código no usa imágenes (`look` es libre para el tema).
- `defaultWorld`. `scenes`: colores CSS de la capa ligera por mundo (`sky:[arriba,abajo]`, `ground`, `groundDark`, `sun:false`); el mundo activo queda en `data-world`.
- `palette`: colores (`accent`, `good`, `bad` y los que quieras) y listas de partículas (`confetti`, `hit`, `poof`). Los colores sueltos se exponen como `--te-*`.
- `particles`: `{ shape: 'square' | 'round' | 'mixed' }` forma de las partículas de la capa animada (defecto `square`). *(nuevo)*
- `font`: `{ family, src }` (se carga con `font-display: swap`, nunca bloquea; queda en `--te-font`).
- `sounds`: `{ nombre: def }` donde `def` es uno de:
  - `{ files:[…], vol, synth }` archivos del tema; `synth` = sintetizado de respaldo si el navegador no decodifica el archivo.
  - `{ tones: [[onda, f0, f1, dur, vol, retraso], …], noise: [dur, vol, f0, f1], vol }` sintetizado declarado en el tema, sin archivos. *(nuevo)*
  - `{ synth: 'pop' }` uno de los del motor: `jingle`, `wrong`, `blip`, `crit`, `pop`, `whoosh`, `result`.
  Un sonido del tema con el mismo nombre que uno del motor lo reemplaza (p. ej. `blip`, el tecleo del globo). `resolveSound(theme, nombre)` muestra qué sonará.
- `reactions`: `{ nombre: { anim, reducedAnim, fx:[…], sfx:[…], particles, say:[frases], tone, duration, then } }`. Sin `duration` la animación se
  repite hasta la siguiente reacción; con `duration` pasa a `then`. `reducedAnim` es la pose con movimiento reducido (en `estudio`: poses quietas `happy`/`oops`).
- `camera`: solo la usa el renderizador 3D de `minecraft` (`dist`, `height`, `lookY`, `sway`, `swaySpeed`, `worlds`).
- `shots`: encuadres `{ clave: { x, zoom, yaw, height, flip } }`. `x` = centro del personaje en pantalla (fracción del ancho, + derecha), `zoom` (1 = normal),
  `yaw`/`height` ángulo y altura de la cámara (3D), `flip` lo refleja (2D). La capa ligera usa `x` y `zoom` (variables `--te-x`, `--te-s`). Mismas claves en
  todos los temas: `centro`, `izquierda`, `derecha`, `cerca-izquierda`, `cerca-derecha`, `lejos` (el generador de la app las reparte). *(nuevo)*
- `enters`: entradas del personaje al llegar a un lugar (`camina`, `salta`, `gira`, `saluda` en minecraft; `vuela`, `cae`, `aparece`, `saluda` en estudio). *(nuevo)*
- `props`: decorados de fondo `{ clave: {} }` que dibuja el renderizador del lado libre del encuadre (minecraft: taller, biblioteca, circuito, corral, portal,
  campamento, mina; estudio: reloj, planta, globo, libros). *(nuevo)*
- `visuals`: `{ module, objects: { objeto: [acciones] } }` objetos para explicar (ver abajo). El generador de Taps valida el banco contra este catálogo. *(nuevo)*

Todo lo marcado *(nuevo)* es opcional y retrocompatible: el tema `minecraft` funciona sin cambios.

### Interfaz del renderizador

`createRenderer(opts)` (puede ser async) recibe `{canvas, width, height, theme, resolve, vendor, skinview3d, reducedMotion}`, donde `canvas` es el lienzo de
salida (el renderizador dibuja ahí cada fotograma; el motor pinta las partículas encima con su contexto 2D) y `resolve(rel)` convierte rutas del tema en URLs. Devuelve:
`setScene({world,host,item,props,shot,enter})` (`shot` llega ya resuelto como objeto; `enter` solo cuando cambia el lugar), `preload(spec)`, `play(anim)`, `fx(name)`,
`frame(dt)`, `anchor('head'|'top'|'chest'|'feet') → [px, py]`, `setSize(w,h)`, `dispose()` y, opcional, `nudge(dx, ahora)` (correr al personaje para hacerle sitio a un objeto).

### Objetos para explicar (`visuals.js`)

`createVisual({objeto, accion, valor}, {reducedMotion}) → { label, duration, draw(ctx, w, h, t), tap?(u, v), drag?(u, v) } | null`. El motor crea un lienzo dentro del
contenedor de la app, anima `t` de 0 a `duration` (con movimiento reducido dibuja directo el estado final), llama `tap` al tocar (si no devuelve `false`, repite)
y `drag` al arrastrar (`u`, `v` = posición 0..1 dentro del objeto). `label` es la descripción para lectores de pantalla. Sin imágenes: todo es Canvas 2D.

| Tema | Objeto | Acciones | Qué muestra |
|---|---|---|---|
| minecraft | `receta` | `crafteo` (`valor` = receta: palos, cubo, cama, escudo, manzana-oro, tnt, antorcha, horno, linterna, libro, estanteria, brujula, mesa-encantar, palanca, lampara, tolva, antorcha-redstone) | La mesa de crafteo se llena casilla por casilla y sale el resultado; arrastrar la arma a mano |
| minecraft | `piston` | `bloquea` | Empuja tierra (se mueve) y luego obsidiana (no se mueve); arrastrar empuja a mano |
| minecraft | `reloj` | `dia`, `cama` | Ciclo de 20 minutos (día, atardecer, noche, amanecer); dormir salta la noche |
| minecraft | `comparador` | `cofre` | El cofre se llena y la señal sube de 0 a 15; arrastrar lo llena o vacía |
| estudio | `balanza` | `compara` (`valor` = `0,5\|0,45`) | Iguala los decimales y se inclina hacia el mayor |
| estudio | `calendario` | `febrero`, `atras` (`mi\|3`), `manana` (`do`) | Febrero sin día 30; saltos hacia atrás en la semana |
| estudio | `palabra` | `contar` (`BANANA\|A`), `ultima` (`TODO`), `medio` (`PARÍS`) | Fichas de letras que se marcan una a una; arrastrar pasa una lupa |
| estudio | `planetas` | `cercano`, `grande`, `ocho` | Los 8 planetas en fila junto al Sol; arrastrar dice el nombre de cada uno |
El motor llama `frame(dt)` a su ritmo (tope de 24-30 fps); todo lo demás (partículas, globo, sonido, fps, pausa, degradación) ya está resuelto afuera.
Con movimiento reducido el motor solo dibuja un instante tras cada cambio: el renderizador debe poder mostrar la pose final en el primer fotograma.

### Ejemplo: así está hecho `estudio`

- **Personaje** (`rig.js`): un robot flotante de cabeza-pantalla. Huesos: cuerpo (inclinación y aplastado), cabeza (inclinación y rebote), dos brazos de dos
  segmentos (hombro y codo), antena con muelle que reacciona al movimiento, propulsor con llama. La cara es dibujo en la pantalla: ojos (normal, feliz, X, triste,
  pensando, parpadeo), boca (hablar, sonrisa, ondulada, triste) y rubor.
- **Animaciones**: cada una es una función pura `(t, T) → pose` (`idle`, `talk`, `think`, `celebrate`, `hurt`, `dance`, `sad` y las quietas
  `happy`, `oops`, `still`). El renderizador mezcla la pose actual hacia la nueva (suavizado exponencial), así no hay saltos entre reacciones.
- **Escenarios** (`scenery.js`): `laboratorio`, `espacio`, `aula`, `biblioteca`, `observatorio`, `jardin`, `cocina` y `museo`, con colores lisos, textura de
  cuaderno y sombras duras (sin degradados). Se pintan una vez por mundo, decorado y tamaño en un lienzo aparte (máximo 2 en memoria) y cada fotograma
  es un `drawImage` + un detalle animado de menos de 15 figuras (burbujas, estrellas, polvo de tiza, mariposas, vapor).
- **Encuadres y entradas**: el personaje se corre de lado, cambia de tamaño o se refleja según `shot`, y entra volando, cayendo, apareciendo o saludando.
- **Objetos** (`scene.item`): `matraz`, `lupa`, `libro`.
- **Personajes**: `chispa` (morado GEMS, antena de bola) y `nube` (magenta, dos antenas). Un personaje nuevo es solo un `look` en `theme.json`.
- **Efectos** (`fx`): `ring` (aro de luz), `flash`, `shake`.
- **Rendimiento**: sin WebGL, sin imágenes, sin audio descargado. ~16 KB gzip el tema completo (más 19 KB de la fuente Rubik, opcional y compartida con el sitio).

## Agregar un Tap

Un Tap es un objeto de datos (tipos en `src/app/taps/taps.types.ts`; ejemplos en `taps/*.json` y `src/app/taps/taps.data.ts`):

```jsonc
{
  "id": "redstone",
  "theme": "minecraft",
  "title": "Redstone", "kicker": "Quiz de bloques",
  "scene": { "world": "cueva", "host": "sofi", "item": "pick", "shot": "lejos", "enter": "camina", "props": "circuito" },
  "backdrop": ["#0b0a09", "#3a322b"],                 // franjas planas del cielo mientras carga (solo en la app)
  "ground": "#6b6b6b",                                // suelo del fondo inmediato
  "questions": [{ "id": "piston", "q": "…", "options": ["…"], "answer": 2, "why": "Explicación corta.",
                  "visual": { "objeto": "piston", "accion": "bloquea" } }],   // opcional: objeto para explicar
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
- Tema `estudio`: arte y sonidos originales generados por código; fuente Rubik (OFL). Ver `themes/estudio/LICENSE.txt`.
- Licencias: texturas Pixel Perfection / Minetest Game (CC BY-SA, ver `textures*/LICENSE*`), sonidos Minetest Game, skinview3d (MIT), fuente Pixelify Sans (OFL).
  «No es un producto oficial de Minecraft. No está aprobado por Mojang ni Microsoft.»
