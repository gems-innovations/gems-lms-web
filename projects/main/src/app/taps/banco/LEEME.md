# Banco de preguntas de Taps (fuente de los Taps de la app)

`minecraft.json`, `logica.json` y `cultura.json` son una **copia** del banco revisado que se escribe en
`gems-lms/producto/taps/banco/` (ahí están el formato completo, los criterios editoriales y la revisión independiente).
Viven aquí para que el build no dependa de nada fuera del repo.

## Cómo se actualiza

1. Edita el banco en `producto/taps/banco/` y corre allí `node validar.mjs` hasta ver «Todo bien».
2. Copia los tres JSON sobre esta carpeta.
3. Desde `gems-lms-web`: `npm run taps:generar`. Valida los límites (pregunta ≤ 120, opciones ≤ 22 y exactamente 4, o 2 en
   los formatos `duo` y `vf`, explicación ≤ 90, respuesta válida, ids únicos, 5 preguntas por Tap) y escribe `../taps.banco.generated.ts`.
   Si algo falla, no escribe nada y dice qué pregunta y qué límite.
4. Sube los JSON y el `.generated.ts` en el mismo commit. `npm run taps:verificar` (y `npm run taps:test`) falla si el
   archivo generado no coincide con el banco.

No se edita `taps.banco.generated.ts` a mano.

## Campos que el generador entiende además del formato del banco

- En un Tap: `"retirado": true` lo saca de la app (su id queda en `TAPS_RETIRADOS` y el enlace avisa «este Tap se retiró»);
  `"resultados": [...]` le da títulos propios en vez de los del tema.
- Las preguntas en `estado: "borrador"` o `"retirada"` no pueden estar en un Tap publicado.
- En una pregunta: `"tipo": "duo"` o `"tipo": "vf"` (opcional; sin él es clásica de 4 opciones). `duo`: exactamente 2 opciones,
  una contra otra, con cuenta regresiva de 7 s (sin respuesta cuenta como fallo). `vf`: verdadero o falso, con `options`
  exactamente `["Verdadero", "Falso"]` y `answer` 0 (verdadero) o 1 (falso); se responde tocando o deslizando hacia el lado
  de la opción. Un Tap puede mezclar formatos (p. ej. `mc-duelo-1`: 2 clásicas, 2 duo, 1 vf). El generador falla si el
  número de opciones no cuadra con el tipo.
- En una pregunta: `"visual": { "objeto": "piston", "accion": "bloquea", "valor": "…" }` (opcional) muestra un objeto que el
  usuario puede tocar y arrastrar junto a la explicación al fallar. El catálogo está en el `theme.json` del tema
  (`visuals.objects`) y en `public/taps-engine/README.md`; el generador falla si el objeto o la acción no existen.
  Para una pregunta reutilizada de `retos.data.ts`, el campo va en su entrada de `existentes`.
- En una pregunta: `"escena": { "tipo": "codigo" | "operacion" | "serie" | "objeto" | "diagrama", … }` (opcional) muestra
  algo de lo que se PREGUNTA mientras se piensa: un fragmento de código (`lineas`, `lenguaje`), una cuenta grande
  (`lineas`), una serie en fichas con un `?` (`items`) o un objeto/diagrama del tema (`cosa`, catálogo `escenas.objects` del
  `theme.json`), con un pie opcional (`texto`). El generador falla si el formato no cabe, si la cosa no existe o si la
  escena muestra escrita la opción correcta (nunca debe delatar la respuesta). Formato completo en `public/taps-engine/README.md`.
- En el tema: `"titulosPorSubtema": { "<subtema>": [...] }` da títulos propios a cada subtema (mismo formato que
  `titulosResultado`; un subtema sin entrada usa los del tema). Así «Crack de bloques» no sale en todos los Taps de Minecraft.
- En cada título: `"lineas": ["…", "…"]` (hasta 2 variantes más de su `line`). La app elige una con semilla al mostrar
  el resultado, fija para la misma partida.
- Los dos campos también están en `producto/taps/banco/` (su `validar.mjs` los ignora): al copiar el banco no se pierden.

## Escena de cada Tap (tema visual, personaje, mundo, objeto, encuadre, entrada y decorado)

Reglas fijas en `projects/main/scripts/generar-taps.mjs`: cada Tap publicado tiene su lugar en `LUGARES` (mundo, objeto en
la mano y decorado de fondo); uno nuevo usa la lista de (mundo, objeto) de su subtema (`ESCENAS`). El personaje, el
encuadre (`ENCUADRES`: izquierda, derecha, cerca, lejos, centro) y la entrada rotan por orden dentro del tema, así dos Taps
seguidos no se ven iguales. El gancho (`ESCENA_GANCHO`) va centrado y saluda.
Modo cine (`asignarCine`): encima de eso cada Tap recibe plano de cámara (general, cenital, picado, contrapicado, primer
plano, travelling, órbita, diagonal), hora del día, clima, fauna de fondo y transición (corte, barrido, zoom, fundido), y se
reparten de nuevo personaje, encuadre y entrada. Se simulan los órdenes reales del feed y cada Tap evita lo que ya tienen sus
vecinos: deslizando 15 seguidos nunca se repite el plano (`taps.cine.spec.ts` lo comprueba). No hay que escribir nada a mano.
Minecraft usa el tema `minecraft` (3D); Lógica y Cultura el tema `estudio` (2D). Para otro mundo u objeto se cambia
esa tabla y se vuelve a generar.
