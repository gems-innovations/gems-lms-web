# Cómo añadir un personaje (3 pasos)

Cada personaje es una carpeta `personajes/<id>/` con un manifiesto. El motor no se toca.

## 1. Pon los archivos

```
personajes/<id>/
├─ modelo.glb        el personaje con sus animaciones (glTF binario)
├─ miniatura.png     el mismo personaje quieto, fondo transparente, 320×400 (capa ligera y tarjeta de compartir)
└─ personaje.json    el manifiesto (paso 2)
```

- **Licencia:** solo CC0 o CC-BY, descargado del sitio oficial del autor (kenney.nl, polyhaven.com, ambientcg.com,
  opengameart.org con licencia CC0). Nada «no comercial», «solo uso personal», rips de juegos ni skins sin licencia clara.
  Quaternius ya no es CC0 (desde 2026 usa su licencia QAL) y KayKit se descarga desde itch.io: ver
  `producto/taps/personajes-libres.md` antes de usarlos.
- **Peso:** el `.glb` debe quedar por debajo de 300 KB (la prueba lo exige). Optimízalo **sin** meshopt ni Draco (usan
  WebAssembly y la CSP del sitio no lo permite; la prueba lo rechaza), solo cuantizado:
  `npx @gltf-transform/cli@4.5.1 optimize entrada.glb modelo.glb --compress quantize --texture-compress false`
  (si trae muchas animaciones, deja solo las que mapeas: cada clip pesa). Texturas dentro del `.glb`.
- **Miniatura:** escribe primero el `personaje.json` (paso 2), abre `/taps-engine/personajes/miniatura.html?id=<id>` con el
  servidor de desarrollo encendido y pulsa «Descargar PNG» (pose idle, 3/4, fondo transparente). Guárdala en la carpeta.
- **Escalas:** no hace falta ajustar el tamaño: el motor mide el modelo en su pose `idle` y lo deja a la misma altura que
  los demás (`escala` lo agranda o achica sobre eso; las mascotas cúbicas usan 0.62).

## 2. Escribe `personaje.json`

```json
{
  "id": "zorro",
  "nombre": "Fito",
  "tipo": "glb",
  "archivo": "modelo.glb",
  "miniatura": "miniatura.png",
  "escala": 0.62,
  "giro": 0,
  "animaciones": {
    "idle": "idle", "pensar": "idle", "hablar": "eat", "acierto": "gesture-positive",
    "fallo": "gesture-negative", "celebrar": "dance", "triste": "gesture-negative", "caminar": "walk"
  },
  "licencia": {
    "nombre": "CC0 1.0", "url": "https://creativecommons.org/publicdomain/zero/1.0/", "autor": "Kenney (www.kenney.nl)",
    "fuente": "https://kenney.nl/assets/cube-pets", "original": "Cube Pets 2.0 · Models/GLB format/animal-fox.glb",
    "cambios": "Solo los clips usados; cuantizado (KHR_mesh_quantization)."
  }
}
```

- `tipo`: `glb` (3D, tema «aventura»), `skin-blocky` (PNG de skin 64×64 para el tema «minecraft»: `archivo` = la skin,
  `slim` opcional) o `sprite2d` (una imagen plana: `archivo` = PNG).
- `animaciones`: nombre del clip del `.glb` para cada reacción del motor. Obligatorias: `idle`, `pensar`, `hablar`,
  `acierto`, `fallo`, `celebrar`. Opcionales: `triste` (si falta usa `fallo`) y `caminar` (entrada «camina»). Encima de cada
  clip el motor añade su propio movimiento (salto al acertar, sacudida al fallar, giro al celebrar).
- `giro`: radianes, por si el modelo no mira a la cámara.

## 3. Ponlo en un tema y corre las pruebas

1. Agrega el id a `"personajes"` en `themes/aventura/theme.json` (el orden importa: el primero es el del Tap de gancho y el
   resto entra en la rotación de los Taps de ese tema).
2. Añade su fila en `../ATRIBUCIONES.md` (id, licencia, autor, fuente) y, si quieres que tenga voz propia, sus frases en
   `src/app/taps/taps.frases.ts` (si no, usa las generales… pero la prueba de frases pide frases propias para todo
   personaje que salga en un Tap).
3. `npm run taps:generar` (reparte personajes y fondos entre los Taps y reescribe `../registro.json`, el índice que el
   motor pide en una sola petición; sin regenerar, el motor pide el manifiesto suelto y también funciona), `npm run taps:test` (valida manifiesto, peso,
   clips y licencia) y mira el resultado en `/taps-engine/demo.html?tap=aventura&host=<id>`.

Los **fondos** funcionan igual: `fondos/<id>/fondo.json` con `nombre`, `tipo` (`imagen` | `color`), `archivo`,
`cielo: ["#arriba", "#abajo"]`, `suelo`, `sueloOscuro`, `horizonte` (altura del suelo en la imagen, 0..1), `luz`
(`{ color, intensidad }`), `sol: false` si es de noche, y la misma `licencia`. Se agregan a `"fondos"` del theme.json.
Para retocar un fondo: `?tap=aventura&world=<id>` en la demo.
