# Banco de preguntas de Taps (fuente de los Taps de la app)

`minecraft.json`, `logica.json` y `cultura.json` son una **copia** del banco revisado que se escribe en
`gems-lms/producto/taps/banco/` (ahí están el formato completo, los criterios editoriales y la revisión independiente).
Viven aquí para que el build no dependa de nada fuera del repo.

## Cómo se actualiza

1. Edita el banco en `producto/taps/banco/` y corre allí `node validar.mjs` hasta ver «Todo bien».
2. Copia los tres JSON sobre esta carpeta.
3. Desde `gems-lms-web`: `npm run taps:generar`. Valida los límites (pregunta ≤ 120, opciones ≤ 22 y exactamente 4,
   explicación ≤ 90, respuesta válida, ids únicos, 5 preguntas por Tap) y escribe `../taps.banco.generated.ts`.
   Si algo falla, no escribe nada y dice qué pregunta y qué límite.
4. Sube los JSON y el `.generated.ts` en el mismo commit. `npm run taps:verificar` (y `npm run taps:test`) falla si el
   archivo generado no coincide con el banco.

No se edita `taps.banco.generated.ts` a mano.

## Campos que el generador entiende además del formato del banco

- En un Tap: `"retirado": true` lo saca de la app (su id queda en `TAPS_RETIRADOS` y el enlace avisa «este Tap se retiró»);
  `"resultados": [...]` le da títulos propios en vez de los del tema.
- Las preguntas en `estado: "borrador"` o `"retirada"` no pueden estar en un Tap publicado.

## Escena de cada Tap (tema visual, personaje, mundo y objeto)

Reglas fijas en `projects/main/scripts/generar-taps.mjs` (`ESCENAS`, `ESCENA_GANCHO`): cada subtema tiene una lista de
(mundo, objeto) y el n-ésimo Tap de ese subtema usa el n-ésimo par; el personaje rota por orden dentro del tema.
Minecraft usa el tema `minecraft` (3D); Lógica y Cultura el tema `estudio` (2D). Para otro mundo u objeto se cambia
esa tabla y se vuelve a generar.
