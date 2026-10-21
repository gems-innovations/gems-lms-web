# Tipografía de GEMS

## Decisión

**Una familia de interfaz para todo:** Plus Jakarta Sans (variable, pesos 200-800), en el sitio, los cursos, los paneles y los textos de Taps (pregunta, opciones, botones). Cada tema puede tener **una tipografía display** solo para acentos.

| Rol | Fuente | Dónde sí | Dónde no |
|---|---|---|---|
| Interfaz (`--font-interfaz`, `--font-texto`, `--font-titulo`) | Plus Jakarta Sans | Todo el texto | — |
| Display del tema (`--font-display`) | La del tema (p. ej. Pixelify Sans en Bloques) | Título del tema, número grande de puntaje | Opciones, explicaciones, botones, cualquier texto de más de una línea |
| Editorial de Taps (`--tap-serif`) | Instrument Serif (OFL, 400, 21 KB, `public/fonts/instrument-serif-latin-400-normal.woff2`) | La pregunta, el título del resultado, el globo del personaje y el título de la tarjeta para compartir (dirección «documental») | Opciones, botones, interfaz: siguen en Plus Jakarta Sans |
| Documento formal | Certificado (Cinzel, Alex Brush) | Solo el certificado | — |

## Por qué Plus Jakarta Sans

Comparadas para celular, público de 13 a 24 años y peso:

| Opción | A favor | En contra |
|---|---|---|
| **Montserrat** (antes) | Conocida, geométrica | Muy ancha: las preguntas ocupan más líneas en 375 px. Cuatro archivos estáticos sin recortar (~100 KB cada uno, ~300-400 KB por visita). Los números no son tabulares por defecto y la «1» se confunde |
| **Rubik** | Redondeada, juvenil, ya está en el tema «estudio» | Esquinas redondas pesadas en párrafos largos; en pesos bajos se ve blanda; aire de «app infantil» |
| **Nunito** | Muy amable | Demasiado infantil para admisión y empresas; poco contraste entre pesos |
| **Outfit** | Moderna | x-height baja y kerning flojo en 14-16 px; sin cifras tabulares |
| **Plus Jakarta Sans** (elegida) | Moderna y juvenil sin ser infantil; x-height alta y apertura amplia (se lee bien a 16 px en pantallas baratas); más estrecha que Montserrat (una línea menos por pregunta); cifras tabulares (`tnum`) para puntajes; **un solo archivo variable de 27 KB** con todos los pesos; **ya es la fuente de los videos de Quiz de Bloques** (`marketing/quizbloques/motor`), así quien llega desde un video ve la misma letra | Menos conocida; la «g» de dos pisos no existe (es de un piso, más informal) |

Licencia: SIL Open Font License 1.1 (`projects/main/public/fonts/LICENSE-plus-jakarta-sans.txt`).

## Escala (tokens en `design-system.scss`)

Fluida con `clamp()`: el mínimo es el tamaño en un celular de 375 px y el máximo en escritorio.

| Rol | Token | Tamaño (375 px → escritorio) | Peso | Interlineado | Tracking |
|---|---|---|---|---|---|
| Título 1 (hero) | `--texto-titulo-1` | 32 → 56 px | 800 | 1.1 | -0.02em |
| Título 2 (sección) | `--texto-titulo-2` | 24 → 32 px | 800 | 1.15 | -0.02em |
| Título 3 (tarjeta) | `--texto-titulo-3` | 18 → 21 px | 700 | 1.3 | -0.01em |
| Pregunta | `--texto-pregunta` | 19 → 22 px | 700 | 1.3 | -0.01em |
| Opción | `--texto-opcion` | 16 → 17 px | 600 | 1.3 | 0 |
| Cuerpo | `--texto-cuerpo` | 16 px | 400 | 1.6 | 0 |
| Cuerpo destacado (lead) | `--texto-cuerpo-lg` | 17 → 19 px | 400 | 1.6 | 0 |
| Etiqueta (mayúsculas) | `--texto-etiqueta` | 13 px | 700 | 1.2 | 0.08em |
| Puntaje | `--texto-puntaje` | 36 → 48 px | 800 | 1 | -0.03em, `tabular-nums` |

Reglas:

- **Mínimo 16 px** para todo lo que se lee o se toca en el celular (cuerpo, opciones, campos). Las únicas excepciones son etiquetas en mayúscula, metadatos («3 lecciones») y contadores, a 12-13 px.
- Números que cambian (puntaje, racha, contador, progreso) siempre con `font-variant-numeric: tabular-nums`, para que no «bailen».
- Títulos y preguntas con `text-wrap: balance`.

```scss
.pregunta { font: 700 var(--texto-pregunta)/var(--interlineado-pregunta) var(--font-texto); letter-spacing: var(--tracking-pregunta); }
.puntaje  { font: 800 var(--texto-puntaje)/1 var(--font-titulo); font-variant-numeric: tabular-nums; }
```

## Rendimiento

- Un archivo: `projects/main/public/fonts/plus-jakarta-sans-latin-var.woff2` (27 KB, subconjunto latino con tildes, ñ, ¿¡ y «»).
- `font-display: swap` y `<link rel="preload" … crossorigin>` en `index.html` (se pide en paralelo con el CSS).
- El service worker lo guarda (`ngsw-config.json`, grupo `visual-assets`).
- **Antes:** Montserrat en 4 archivos de 97-101 KB (396 KB en total; una visita típica bajaba 3, unos 300 KB). **Ahora:** 27 KB para todos los pesos (≈ -270 KB por primera visita).

## Taps

Taps hoy usa `system-ui` en el shell (`html.taps-page`) y Pixelify Sans en preguntas del tema Bloques. Con 27 KB ya no hace falta evitar la fuente de marca: al adoptar el sistema, la pregunta y las opciones pasan a `var(--font-interfaz)` y Pixelify queda como `--font-display` del tema (título y burbuja). El tema «estudio» (PR #25) puede dejar Rubik o limitarla a `--font-display`.

Dirección «documental» (producto/taps/direccion-visual.md): la pregunta y el título del resultado van en **Instrument Serif**
(`--tap-serif`), una serif editorial libre de un solo peso. Se declara en `taps-feed.component.scss` (`@font-face` con
`font-display: swap`), así solo se pide al entrar a Taps y nunca bloquea el texto; mientras llega se ve Georgia. Las opciones,
los botones y la interfaz siguen en Plus Jakarta Sans. El archivo viene de `@fontsource/instrument-serif` 5.3.0 (latín, 21 KB);
licencia en `public/fonts/LICENSE-instrument-serif.txt`.
