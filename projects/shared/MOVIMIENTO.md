# Movimiento, microdiseño e iconos de GEMS

Un solo lenguaje de movimiento para toda la plataforma (portada, retos, cursos, ingreso, reproductor, paneles) y para Taps. La idea es que pasar del feed de Taps a un curso no se sienta como cambiar de app: los toques responden igual, los aciertos celebran igual y los errores se marcan igual.

- **Tokens:** `projects/shared/src/infrastructure/ui/styles/design-system.scss` (`--dur-*`, `--curva-*`, `--radio-*`, `--glass-*`, `--texto-*`).
- **Patrones globales (presión, foco, aparición, acierto/error, cambio de página):** `projects/shared/src/infrastructure/ui/styles/_movimiento.scss`, cargado una vez desde `projects/main/src/styles.scss`.
- **Piezas por componente (iconos de vidrio, chip, esqueleto, progreso):** mixins en `projects/shared/src/infrastructure/ui/styles/_piezas.scss`. No son globales para no sumar al CSS inicial (el bundle inicial está cerca del límite de 800 kB): el componente que las usa las incluye en su `.scss` (`@use 'piezas'; @include piezas.iconos;`).
- **Ayudantes TS:** `projects/shared/src/infrastructure/ui/directives/motion.ts` (exportados desde `shared`).
- **Tipografía:** ver [TIPOGRAFIA.md](./TIPOGRAFIA.md).

## Reglas

1. **Solo se animan `transform` y `opacity`.** Nada de `width`, `height`, `top`, `margin`, `box-shadow` animado en bucle ni `filter` en elementos grandes. Así se mantienen 60 fps en un Android de gama baja.
2. **La primera señal llega en menos de 100 ms.** La presión se ve en 80 ms y el color de acierto o error antes de 300 ms (como en Taps). La animación decorativa viene después.
3. **El color nunca es la única señal.** Acierto: marca (`circle-check`) + texto. Error: X + texto. Las opciones no elegidas se atenúan.
4. **Movimiento reducido.** Con `prefers-reduced-motion: reduce` o con la preferencia «Reducir movimiento» de la plataforma (`html.reduce-motion`), nada se desplaza ni escala: lo que comunica estado pasa a un fundido de 150 ms (`--dur-reducida`) y lo demás es instantáneo. No hay que escribir nada extra si se usan las clases `gm-*`.
5. **No animar:** textos largos, tablas, el contenido de una lección mientras se lee, fondos grandes en bucle, nada que dure más de 500 ms en un flujo de estudio. No usar `backdrop-filter` sobre áreas grandes ni sobre algo que se mueve.
6. **Sin librerías de animación en la carga inicial.** Todo es CSS. El confeti (`canvas-confetti`) y `auto-animate` se cargan bajo demanda.

## Tokens

| Token | Valor | Uso |
|---|---|---|
| `--dur-instante` | 80 ms | Presión de un toque |
| `--dur-rapida` | 120 ms | Hover, color, borde, foco |
| `--dur-base` | 200 ms | Aparecer, cambiar de estado, pop |
| `--dur-enfasis` | 320 ms | Acierto, error, tarjetas y hojas que entran |
| `--dur-lenta` | 480 ms | Aparición al hacer scroll, cambio de página, barras de progreso |
| `--dur-reducida` | 150 ms | Fundido que reemplaza al movimiento |
| `--curva-salida` | `cubic-bezier(.16, 1, .3, 1)` | La de casi todo: entra rápido y frena suave |
| `--curva-estandar` | `cubic-bezier(.4, 0, .2, 1)` | Colores y opacidad |
| `--curva-entrada` | `cubic-bezier(.4, 0, 1, 1)` | Solo lo que sale de pantalla |
| `--curva-rebote` | `cubic-bezier(.2, 1.4, .4, 1)` | «Spring» de Taps: píldoras, aciertos, marcas |
| `--presion-escala` | 0.97 | Escala al presionar |
| `--elevar-hover` | -2px | Elevación al pasar el mouse |
| `--radio-control` / `--radio-tarjeta` / `--radio-pastilla` | 12 / 16 / 999 px | Botones y opciones / tarjetas / chips |
| `--z-toast` / `--z-confeti` | 1080 / 1090 | Por encima de modales |

`--transition-fast`, `--transition-base`, `--transition-slow` y `--transition-easing` siguen existiendo como alias (120 ms, 200 ms, 480 ms, curva estándar), así el código viejo ya usa los valores nuevos.

## Patrones

| Patrón | Cómo se usa | Qué hace |
|---|---|---|
| Presionar | Automático en `button` y `[role=button]`; en enlaces o tarjetas, clase `gm-presion` | `scale(.97)` en 80 ms, vuelve con curva de salida |
| Elevar (hover) | `gm-elevar` (o `lib-lift`) | Sube 2 px con sombra; solo con mouse |
| Aparecer al montarse | `gm-aparecer`, escalonado con `style="--gm-i: 2"` | Opacidad + 8 px, 320 ms |
| Aparecer en scroll | Directiva `libReveal` (`[revealIndex]` para cascada) | Opacidad + 14 px al entrar en pantalla |
| Pop | `gm-pop` | De 0.94 a 1 con rebote (píldoras, marcas, resultados) |
| Acierto | `gm-acierto` (o `marcarAcierto(el)`) | Rebote corto + destello verde |
| Error | `gm-error` (o `marcarError(el)`) | Sacudida corta + destello rojo |
| Esqueleto | `gm-skeleton` (mixin `piezas.skeleton`) | Barrido con `transform` (no `background-position`) |
| Progreso | `<div class="gm-progreso"><span [style.--p]="0.6"></span></div>` (mixin `piezas.progreso`) | El relleno escala en X con 480 ms |
| Aviso (toast) | `gm-toast` (ya puesto en `lib-toast`) | Sube 12 px y se funde |
| Confeti contenido | `celebrarEn(el)` | ~36 piezas que salen del elemento, colores GEMS |
| Confeti grande | `celebrate()` | Curso completo, certificado |
| Cambio de página | Automático (`withViewTransitions`) | Sale con fundido de 120 ms, entra subiendo 8 px; sin soporte, solo fundido |
| Foco visible | Automático (`:focus-visible`) | Anillo de 2 px con separación de 2 px |

### Ejemplos

Opción de quiz con acierto y error (Angular):

```html
<button type="button" class="mock__opt"
        [class.gm-acierto]="elegida() === k && k === correcta"
        [class.gm-error]="elegida() === k && k !== correcta"
        (click)="elegir(k)">
  {{ texto }}
  @if (elegida() !== null && k === correcta) { <svg lucideCircleCheck [size]="20" aria-hidden="true"></svg> }
</button>
@if (elegida() !== null) { <p class="gm-aparecer">{{ explicacion }}</p> }
```

Repetir la animación sobre el mismo elemento (por código):

```ts
import { marcarAcierto, marcarError, celebrarEn } from 'shared';

marcarAcierto(boton);           // reinicia la animación aunque la clase ya estuviera
if (racha % 5 === 0) void celebrarEn(tarjeta);
```

Lista que entra en cascada:

```html
@for (c of cursos(); track c.id; let i = $index) {
  <article class="card gm-aparecer" [style.--gm-i]="i">…</article>
}
```

## Iconos de vidrio (`.gm-icono`)

Se activan en el `.scss` del componente que los usa:

```scss
@use 'piezas';
@include piezas.iconos;    // .gm-icono y .gm-chip
@include piezas.skeleton;  // .gm-skeleton
@include piezas.progreso;  // .gm-progreso
```

Contenedor translúcido con brillo arriba, borde de 1 px, sombra suave teñida y el icono de lucide con trazo 2.25. Al presionar el icono (o el botón/enlace que lo contiene) se encoge a 0.92 y brilla.

| Variante | Clases | Para qué |
|---|---|---|
| Base | `gm-icono` (40 px) | Icono suelto en una lista o encabezado |
| Tarjeta | `gm-icono gm-icono--tarjeta` (44 px) | Icono de una tarjeta o de una opción de menú |
| Tema / categoría | `gm-icono gm-icono--tema` + `style="--tinte: #F5B83D"` | Cada tema o categoría con su color fijo (patrón Preguntados) |
| Destacado | `gm-icono gm-icono--destacado` | Trazo con el degradado de marca (#C471ED → #7B6FF0 → #4DE1FF); logros y beneficios |
| Flotante | `gm-icono gm-icono--flotante` (48 px, redondo) | Rieles sobre video o escena (tipo TikTok); el único con desenfoque |
| Tamaños | `gm-icono--sm` (28 px), `gm-icono--lg` (56 px) | |
| Chip con icono | `<span class="gm-chip"><span class="gm-icono gm-icono--sm">…</span>Texto</span>` | Píldora de vidrio: «x3 seguidas», «Sin registro» |

```html
<span class="gm-icono gm-icono--tema gm-icono--tarjeta" style="--tinte: var(--color-acento)" aria-hidden="true">
  <svg lucideSend [size]="22"></svg>
</span>
```

- El degradado del destacado vive en `app.html` (`<linearGradient id="gm-degradado-icono">`); en tema claro se oscurece para mantener contraste.
- **Rendimiento:** el desenfoque (`backdrop-filter: blur(14px) saturate(170%)`) solo lo lleva `--flotante` y solo si el navegador lo soporta (`@supports`). Sin soporte, con `prefers-reduced-transparency: reduce` o en **modo ligero** (`html.modo-ligero`, vía `:host-context`, equipos con ≤ 2 GB o con ahorro de datos, lo pone `app.ts`) el fondo pasa a un color sólido semitransparente. Las demás variantes imitan el vidrio con degradados (sin costo de GPU).
- **Peso del bundle:** desde #29 `@lucide/angular` ya no está en el arranque (el toast y el buscador de `shared` dibujan su SVG en línea), así que los iconos de lucide de las pantallas diferidas van en chunks diferidos. La regla es no volver a importar `@lucide/angular` en nada que cargue al inicio (`shared`, `app.ts`, cabecera, toast): si un componente de arranque necesita un icono, va como SVG en línea. Aun así, antes de sumar un icono nuevo revisa si alguno de los que ya se usan sirve (`circle-check`, `x`, `zap`, `send`, `school`, `graduation-cap`, `shield-check`, `trophy`, `flame`, `star`, `lock`…).
- Los iconos son decorativos: `aria-hidden="true"` y el significado va en el texto.

## Taps: cómo adoptarlo

Taps (`projects/main/src/app/taps/`) aún usa sus valores propios. Cuando termine su ronda, el cambio es mecánico:

| En Taps hoy | Token o clase |
|---|---|
| `transition: transform .08s` en la opción | `var(--dur-instante)` |
| `cubic-bezier(.2, 1.4, .4, 1)` de las píldoras | `var(--curva-rebote)` |
| `@keyframes pop` (scale .94) | `gm-pop` |
| `pop .22s` del bocadillo, `.3s` de la tarjeta | `var(--dur-base)` / `var(--dur-enfasis)` |
| Opción 16 px de radio, píldoras 999 px | `var(--radio-tarjeta)`, `var(--radio-pastilla)` |
| Botones del riel (44 px, fondo negro translúcido) | `gm-icono gm-icono--flotante` |
| Chip «x3 seguidas» | `gm-chip` con `gm-icono--tema` |
| `font-family: system-ui` / Pixelify en preguntas | `var(--font-interfaz)`; Pixelify solo como `--font-display` del tema |

Lo que Taps conserva a propósito: la presión que **baja 2 px** con sombra de base (es un botón físico sobre el escenario), los 4 colores de opción con forma y las duraciones de la coreografía de respuesta (1,4 s de avance, 3,5 s de explicación), definidas en `producto/taps/experiencia-ux.md`.
