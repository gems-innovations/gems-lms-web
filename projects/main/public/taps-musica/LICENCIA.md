# Música de Taps: licencia

Las 10 pistas instrumentales y las 3 canciones con letra de esta carpeta se generaron con **Eleven Music** (ElevenLabs)
en la cuenta de GEMS Innovations.

- Licencia: Eleven Music, plan Creator, 2026-10-19.
- Términos: https://elevenlabs.io/music-terms. En planes de pago se permite el uso comercial en línea, salvo cine, TV,
  radio y «Studio Games» (videojuegos comercializados en más de una plataforma). Taps es una app web educativa.
  Si algún día se publica como app en tiendas y se monetiza, revisar con ElevenLabs si aplica esa restricción.
- Generadas en plan Creator: el derecho de uso se mantiene aunque luego se baje de plan.

| Pista | Uso en Taps |
|---|---|
| pixel-quest-loop | Minecraft (la que más pesa en su grupo); pesa más en pradera, bosque, nieve y desierto |
| cave-quiz-crawl | Minecraft; pesa más en cueva y noche |
| magma-quest-loop | Minecraft; pesa más en Nether y End |
| village-morning-loop | Minecraft y Cultura; pesa más en aldea y casa |
| island-quiz-loop | Minecraft y Cultura; pesa más en playa |
| puzzle-tick-loop | Lógica y trampas (la que más pesa en su grupo); pesa más en aula y laboratorio |
| cozy-study-loop | Lógica y Cultura; pesa más en biblioteca. También la de temas sin pista propia |
| orbit-quiz-drift | Lógica y Cultura; pesa más en espacio, observatorio y noches estrelladas |
| wonder-loop | Cultura general (la que más pesa en su grupo) |
| prize-parade-loop | Pantalla de resultado |
| tap-tap-aprende, piensa-bien | Fragmento de 12 s al terminar un Tap con 5/5 |
| racha-en-racha | Fragmento de 12 s al subir la racha |

Cada categoría tiene un grupo de pistas compatibles y cada Tap elige una (siempre la misma para ese Tap, nunca la del
Tap anterior). El mapa está en `MAPA` (script de abajo) y en `musica.json`.

Los archivos publicados son derivados (mono, volumen igualado, bucle cerrado, fragmentos) hechos con
`projects/main/scripts/procesar-musica-taps.mjs` a partir de los originales en `producto/taps/musica/`.
