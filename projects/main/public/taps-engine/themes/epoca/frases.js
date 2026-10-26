// Frases del bocadillo del diseñador (PR-D4, producto/taps/disenador-v2-plan.md §5): seis por tipo de cambio, más una o dos
// en la voz de cada punto de partida (Nefer no habla como Marta), y memoria de las tres últimas dichas para no repetir.
// Módulo puro: `crearFrases({ aleatorio })` recibe el generador (las pruebas pasan uno fijo); `frase(tipo, base)` elige.

/** Seis frases por tipo de cambio (las mismas claves que usa `reaccionar()` en disenador.js). */
export const FRASES = Object.freeze({
  hat: ['¿Me queda bien?', 'Buen sombrero.', 'Con esto ya parezco alguien.', 'Me lo acomodo y listo.', 'Mejor que a pelo.', 'Se me ve la cara igual, ¿no?'],
  hair: ['Nuevo peinado.', '¿Qué tal así?', 'Recién salido de la peluquería.', 'Me siento más ligero.', 'Hoy sí me peiné.', 'Que no se me despeine.'],
  outfit: ['¡Mira este cambio!', 'Me gusta esta ropa.', 'Doy la vuelta y ya está.', '¿Me ves distinto?', 'Esto abriga más.', 'Ahora sí voy vestido para la ocasión.'],
  color: ['Buen color.', 'Combina bien.', 'Ese tono me va.', 'Lo miro y me gusta.', 'Más vivo así.', 'Un color con carácter.'],
  face: ['Esta es mi cara.', '¿Me reconoces?', 'Soy yo, pero mejor.', 'Mírame bien.', 'La misma sonrisa.', 'Así me veo al despertar.'],
  gafas: ['Ahora veo mejor.', '¿Me dan aire de sabio?', 'Las gafas me cambian la cara.', 'Me las subo y ya.', 'Veo hasta tus ideas.', 'Sin gafas también veía, eh.'],
  barba: ['Me la acaricio y pienso.', '¿Me hace más serio?', 'La barba da respeto.', 'Tardé años en dejarla crecer.', 'Suave, ¿verdad?', 'Así parezco un sabio.'],
  item: ['Lo llevo en la mano.', '¿Y esto?', 'Lo levanto para que lo veas.', 'Mi herramienta de siempre.', 'Con esto hago mi trabajo.', 'No salgo sin esto.'],
  world: ['Aquí me siento en casa.', 'Buen lugar.', 'Ya soy yo.', 'Este es mi mundo.', 'Aquí pasa todo.', 'Respira este aire.'],
  sorpresa: ['¡Sorpresa!', 'A ver qué tal.', 'No me lo esperaba.', '¿Y si me queda bien?', 'Mezcla nueva.', 'Esto es otra cosa.'],
  deshacer: ['Como antes.', 'Mejor así, sí.', 'Vuelvo atrás.', 'Sin problema.', 'Lo probamos y ya.', 'Nada se pierde.'],
  sugerencia: ['Buena idea.', 'Así va mejor.', 'Me leíste la mente.', 'Eso le faltaba.', 'Ahora cuadra.', 'Buen ojo.'],
  guardar: ['¡Guardado!', 'Aquí me quedo.', 'Ya no me pierdo.', 'Me acordaré de ti.', 'Listo para volver.', 'Un lugar para mí.'],
  cargar: ['¡Aquí estoy otra vez!', 'Me acordaba de ti.', 'Volví.', 'Seguimos donde íbamos.', 'Te estaba esperando.', 'Qué bueno verte.'],
});

/** Una o dos frases en la voz de cada punto de partida (se mezclan con las generales del mismo tipo). */
export const POR_BASE = Object.freeze({
  grabador: { hat: ['Para el taller, perfecto.'], item: ['Con esto grabo planchas.'], world: ['Huele a tinta y a lluvia.'], guardar: ['Como una plancha bien guardada.'] },
  arqueologa: { hat: ['Con sol de desierto, obligatorio.'], item: ['Con cuidado, que todo es antiguo.'], world: ['Aquí hay algo enterrado.'], outfit: ['Lista para la excavación.'] },
  senador: { hat: ['Digno del Senado.'], outfit: ['La toga impone.'], world: ['Ciudadanos, escuchad.'], item: ['Aquí va mi discurso.'] },
  escriba: { hat: ['El sol de Egipto no perdona.'], item: ['Cada signo en su lugar.'], world: ['El río lo da todo.'], hair: ['Fresco para el calor.'] },
  artesano: { hat: ['Para el taller sirve.'], item: ['Hecho con estas manos.'], world: ['Aquí se trabaja de sol a sol.'], outfit: ['Cómodo para trabajar.'] },
  investigadora: { hat: ['No es muy de laboratorio, pero va.'], item: ['A ver qué dice la muestra.'], world: ['Todo medido, todo anotado.'], gafas: ['Ahora sí leo las etiquetas.'] },
  periodista: { hat: ['Como de portada.'], item: ['Aquí apunto todo.'], world: ['Siempre hay una historia.'], outfit: ['Para la próxima entrevista.'] },
});

/** Cuántas frases recién dichas no se repiten. */
export const MEMORIA = 3;
/** Probabilidad de preferir la frase en la voz del personaje cuando existe. */
export const PESO_BASE = 0.4;

/**
 * Crea el elector de frases. `frase(tipo, base)` devuelve una frase del tipo (si no existe el tipo, una de `color`), evitando
 * las tres últimas dichas en cualquier tipo. `saludo(nombre)` es la presentación de un punto de partida.
 */
export function crearFrases({ aleatorio = Math.random } = {}) {
  const dichas = [];
  const elegir = lista => lista[Math.min(lista.length - 1, Math.floor(aleatorio() * lista.length))];
  function frase(tipo, base) {
    const generales = FRASES[tipo] ?? FRASES.color, propias = POR_BASE[base]?.[tipo] ?? [];
    const sinRepetir = l => l.filter(f => !dichas.includes(f));
    let candidatas = propias.length && aleatorio() < PESO_BASE ? sinRepetir(propias) : [];
    if (!candidatas.length) candidatas = sinRepetir([...generales, ...propias]);
    // Tipo con menos de 4 frases (o lista vacía): se repite la que se dijo hace más tiempo.
    if (!candidatas.length) candidatas = [[...generales, ...propias].sort((a, b) => dichas.indexOf(a) - dichas.indexOf(b))[0]];
    const f = elegir(candidatas);
    dichas.push(f); if (dichas.length > MEMORIA) dichas.shift();
    return f;
  }
  return { frase, saludo: nombre => `¡Hola! Soy ${nombre}.`, ultimas: () => [...dichas] };
}
