import { ITapResult } from './taps.types';

/**
 * Frases de reacción de cada personaje (auditoria-permanencia.md, mejora 3). Antes salían por número de pregunta (en la
 * pregunta 1 siempre «¡Exacto!», en la 2 «¡Eso es!»…) y el orden se aprendía en dos Taps. Ahora:
 * - cada personaje tiene su voz: 11 frases de acierto y 10 de fallo, cortas (caben en la píldora a 320 px);
 * - se eligen con una semilla (sesión + Tap + partida + pregunta): el mismo estado da siempre la misma frase, así que
 *   no hay sorpresas entre servidor y navegador ni al volver a pintar;
 * - nunca sale la misma frase dos veces seguidas dentro de una partida;
 * - las rachas de 3 y de 5 aciertos tienen sus propias frases por tema.
 * Tono (competencia-y-recompensas.md §6.3): amable, sin burla y sin culpa. Fallar es parte de aprender.
 * Sin emojis: son texto de interfaz.
 */
export interface IFrasesPersonaje { acierto: readonly string[]; fallo: readonly string[] }

export const FRASES: Readonly<Record<string, IFrasesPersonaje>> = {
  // Minecraft: Leo, el explorador con energía.
  leo: {
    acierto: ['¡Diamante!', '¡Eso es!', '¡Bloque perfecto!', '¡Directo al cofre!', '¡Así se pica!', '¡Mina de oro!', '¡Lo clavaste!',
      '¡Ni lo dudaste!', '¡Exacto!', '¡Brillante!', '¡Qué puntería!'],
    fallo: ['Casi...', 'Uy, por un bloque', 'Esa era tramposa', '¡A la próxima!', 'Te faltó poquito', 'Hasta los pros fallan',
      'Esa engaña a muchos', 'Sigue picando', 'Buen intento', 'Ahora ya la sabes'],
  },
  // Sofi, la constructora tranquila.
  sofi: {
    acierto: ['¡Bien construido!', '¡Perfecto!', '¡Justo así!', '¡Qué buena!', '¡Eso es!', '¡Pieza exacta!', '¡De manual!',
      '¡Lo tenías!', '¡Impecable!', '¡Encaja perfecto!', '¡Bien pensado!'],
    fallo: ['Casi casi', 'Uy, se cayó un bloque', 'Esa tenía truco', 'Tranqui, la próxima', 'Por poquito', 'Esa confunde a todos',
      'Ahora la recuerdas', 'Buen intento', 'A reconstruir', '¡Ánimo!'],
  },
  // Mateo, el valiente de la noche.
  mateo: {
    acierto: ['¡Golpe crítico!', '¡Sin miedo!', '¡Eso es!', '¡Victoria!', '¡Como un pro!', '¡Ni un rasguño!', '¡Certero!',
      '¡Lo sabías!', '¡Qué nivel!', '¡Exacto!', '¡Imparable!'],
    fallo: ['¡Uy! Esa dolió', 'Por un pelito', 'Esa era difícil', 'Levántate y sigue', 'Casi la tienes', 'Esa engaña',
      'Aún te queda vida', 'Buen intento', 'Ya no se te olvida', 'A la próxima'],
  },
  // Dani, el curioso bromista.
  dani: {
    acierto: ['¡Eso!', '¡Bum, correcto!', '¡Así se hace!', '¡Correctísimo!', '¡Qué crack!', '¡Fácil para ti!', '¡Bien jugado!',
      '¡En el blanco!', '¡Exacto!', '¡Mejor imposible!', '¡Pum, adentro!'],
    fallo: ['Casi...', 'Uy, por poco', 'Esa era trampa', 'Ni modo, sigue', 'Esa tenía maña', 'Nos pasa a todos',
      '¡La próxima es tuya!', 'Buen intento', 'Ahora ya sabes', 'Uff, casi'],
  },
  // Estudio: Chispa, rápida y eléctrica.
  chispa: {
    acierto: ['¡Chispazo!', '¡Ni te despeinaste!', '¡Rapidísimo!', '¡Eso es!', '¡Mente veloz!', '¡Bien visto!', '¡Directo!',
      '¡Exacto!', '¡Qué ojo!', '¡Brillante!', '¡Bingo!'],
    fallo: ['Casi...', 'Esa era trampa', 'Uy, por poco', 'Ojo con los detalles', 'Esa engaña a muchos', 'Buen intento',
      'Respira y sigue', 'Te faltó un pelito', 'Ahora la sabes', 'A la próxima'],
  },
  // Nube, calmada y sabia.
  nube: {
    acierto: ['¡Muy bien!', '¡Bien pensado!', '¡Correcto!', '¡Qué buena mente!', '¡Así se piensa!', '¡Lo tenías claro!',
      '¡Muy claro!', '¡Exacto!', '¡Elegante!', '¡Eso es!', '¡Impecable!'],
    fallo: ['Casi...', 'Tranqui, se aprende', 'Esa tenía truco', 'Por poquito', 'Buen intento', 'Esa cuesta a todos',
      'Ahora ya la sabes', 'Uy, por poco', 'Respira, la próxima', 'Seguimos juntos'],
  },
  // Aventura (personajes del registro, public/taps-engine/personajes): Fito, el zorro listo.
  zorro: {
    acierto: ['¡Qué astuto!', '¡Olfato fino!', '¡Eso es!', '¡Zorro listo!', '¡Directo!', '¡Bien olido!', '¡Exacto!', '¡Ni lo dudaste!',
      '¡Rapidísimo!', '¡Bien visto!'],
    fallo: ['Casi...', 'Se me escapó', 'Esa era trampa', 'Buen intento', 'Por un bigote', 'Otra pista y ya',
      'Ahora la sabes', 'Uy, por poco', 'Esa engaña', 'A la próxima'],
  },
  // Lupe, la científica.
  cientifica: {
    acierto: ['¡Hipótesis correcta!', '¡Experimento logrado!', '¡Exacto!', '¡Bien razonado!', '¡Dato confirmado!', '¡Eso es!',
      '¡Qué precisión!', '¡Lo comprobaste!', '¡Brillante!', '¡Correcto!'],
    fallo: ['Casi...', 'A repetir el ensayo', 'Esa tenía truco', 'Buen intento', 'Así se aprende', 'Error útil',
      'Ahora ya la sabes', 'Por poquito', 'Revisemos el dato', 'A la próxima'],
  },
  // Tuerca, el robot.
  robot: {
    acierto: ['¡Cálculo correcto!', '¡Bip bip, bien!', '¡Exacto!', '¡Sistema feliz!', '¡Eso es!', '¡Respuesta válida!',
      '¡Engranaje perfecto!', '¡Directo!', '¡Procesado!', '¡Qué nivel!'],
    fallo: ['Error 404...', 'Casi...', 'Reiniciando...', 'Buen intento', 'Esa era trampa', 'Ajustando tuercas',
      'Por un bit', 'Ahora ya la sabes', 'Recalculando', 'A la próxima'],
  },
  // Bambú, el panda tranquilo.
  panda: {
    acierto: ['¡Muy bien!', '¡Sin prisa y bien!', '¡Eso es!', '¡Tranquilo y exacto!', '¡Correcto!', '¡Qué calma!',
      '¡Lo sabías!', '¡Exacto!', '¡Bien pensado!', '¡Dulce victoria!'],
    fallo: ['Casi...', 'Sin estrés', 'Esa tenía truco', 'Buen intento', 'Respira y sigue', 'Por poquito',
      'Ahora la sabes', 'Uy, por poco', 'Con calma sale', 'A la próxima'],
  },
  // Parche, el pirata.
  pirata: {
    acierto: ['¡Tesoro encontrado!', '¡Al abordaje!', '¡Eso es!', '¡Rumbo correcto!', '¡Exacto, grumete!', '¡Bien navegado!',
      '¡Cofre abierto!', '¡Directo!', '¡Qué puntería!', '¡Lo sabías!'],
    fallo: ['Casi...', 'Ancla fuera de sitio', 'Esa era trampa', 'Buen intento', 'Mar picado', 'Por un pelo de barba',
      'Ahora la sabes', 'Uy, por poco', 'Vira y sigue', 'A la próxima'],
  },
  // Vale, la exploradora.
  exploradora: {
    acierto: ['¡Descubierto!', '¡Buen hallazgo!', '¡Eso es!', '¡Mapa correcto!', '¡Exacto!', '¡Camino abierto!',
      '¡Lo encontraste!', '¡Directo!', '¡Qué ojo!', '¡Bien explorado!'],
    fallo: ['Casi...', 'Otro sendero', 'Esa era trampa', 'Buen intento', 'Por poquito', 'Seguimos buscando',
      'Ahora la sabes', 'Uy, por poco', 'Esa engaña', 'A la próxima'],
  },
  // Época: Tomás, el grabador de Londres (tono sobrio, de oficio).
  grabador: {
    acierto: ['Bien trazado', 'Exacto', 'Sin error de imprenta', 'Eso es', 'Buen ojo', 'Muy bien visto', 'Correcto', 'Justo así', 'Tenías la fecha', 'Impecable'],
    fallo: ['Casi', 'Un borrón nada más', 'Esa engaña a muchos', 'Buen intento', 'Se corrige y se sigue', 'Por poco',
      'Ahora ya la sabes', 'Todos erramos', 'Otra prueba', 'A la próxima'],
  },
  // Época: Inés, la arqueóloga.
  arqueologa: {
    acierto: ['Bien excavado', 'Hallazgo confirmado', 'Exacto', 'Eso es', 'Buen hallazgo', 'Datación correcta', 'Correcto', 'Lo tenías', 'Impecable', 'Muy bien'],
    fallo: ['Casi', 'A seguir excavando', 'Esa engaña a muchos', 'Buen intento', 'Otra capa más', 'Por poco',
      'Ahora ya la sabes', 'Error útil', 'Revisemos el dato', 'A la próxima'],
  },
  // Época: Lucio, el senador romano.
  senador: {
    acierto: ['¡Bien dicho!', 'Veredicto: correcto', 'Exacto', 'Eso es', 'Digno de Roma', 'Muy bien', 'Correcto', 'Lo tenías', 'Impecable', 'Así se habla'],
    fallo: ['Casi', 'Se corrige', 'Esa engaña a muchos', 'Buen intento', 'Roma no cayó en un día', 'Por poco', 'Ahora ya la sabes', 'Otra vez será', 'Repasemos', 'A la próxima'],
  },
  // Época: Nefer, la escriba egipcia.
  escriba: {
    acierto: ['Bien escrito', 'Exacto', 'Eso es', 'Registrado', 'Muy bien', 'Correcto', 'Lo tenías', 'Impecable', 'Bien anotado', 'Sabia respuesta'],
    fallo: ['Casi', 'Se borra y se escribe', 'Esa engaña a muchos', 'Buen intento', 'Por poco', 'Ahora ya la sabes', 'Otra vez será', 'Anotada para luego', 'A la próxima', 'Sin prisa'],
  },
  // Época: Beltrán, el artesano medieval.
  artesano: {
    acierto: ['Bien forjado', 'Exacto', 'Eso es', 'Buen trabajo', 'Muy bien', 'Correcto', 'Lo tenías', 'Impecable', 'Obra maestra', 'Así se hace'],
    fallo: ['Casi', 'A forjar de nuevo', 'Esa engaña a muchos', 'Buen intento', 'Por poco', 'Ahora ya la sabes', 'Otra vez será', 'Se pule y sigue', 'A la próxima', 'Sin prisa'],
  },
  // Época: Marta, la investigadora.
  investigadora: {
    acierto: ['Dato confirmado', 'Exacto', 'Eso es', 'Bien razonado', 'Muy bien', 'Correcto', 'Lo tenías', 'Impecable', 'Hipótesis correcta', 'Buen ojo'],
    fallo: ['Casi', 'A repetir el ensayo', 'Esa engaña a muchos', 'Buen intento', 'Por poco', 'Ahora ya la sabes', 'Error útil', 'Revisemos el dato', 'A la próxima', 'Sin prisa'],
  },
  // Época: Álvaro, el periodista.
  periodista: {
    acierto: ['Titular correcto', 'Exacto', 'Eso es', 'Bien informado', 'Muy bien', 'Correcto', 'Lo tenías', 'Impecable', 'Dato contrastado', 'Buen ojo'],
    fallo: ['Casi', 'Se corrige la nota', 'Esa engaña a muchos', 'Buen intento', 'Por poco', 'Ahora ya la sabes', 'Fe de erratas', 'Contrastemos', 'A la próxima', 'Sin prisa'],
  },
  // Pingo, el pingüino.
  pinguino: {
    acierto: ['¡Bien deslizado!', '¡Fresquísimo!', '¡Eso es!', '¡Exacto!', '¡Qué frío de bueno!', '¡Directo!',
      '¡Correcto!', '¡Lo sabías!', '¡Bien pensado!', '¡Pingüinazo!'],
    fallo: ['Casi...', 'Resbalé un poco', 'Esa era trampa', 'Buen intento', 'Por poquito', 'Hielo traicionero',
      'Ahora la sabes', 'Uy, por poco', 'Esa engaña', 'A la próxima'],
  },
  // Sombra, el ninja.
  ninja: {
    acierto: ['¡Golpe certero!', '¡Silencioso y bien!', '¡Eso es!', '¡Exacto!', '¡Rápido como sombra!', '¡Directo!',
      '¡Técnica perfecta!', '¡Lo sabías!', '¡Impecable!', '¡Ni se oyó!'],
    fallo: ['Casi...', 'Me vieron', 'Esa era trampa', 'Buen intento', 'Por poquito', 'A entrenar',
      'Ahora la sabes', 'Uy, por poco', 'Esa engaña', 'A la próxima'],
  },
  // Hana, amable y observadora.
  hana: {
    acierto: ['¡Precioso!', '¡Muy bien!', '¡Eso es!', '¡Exacto!', '¡Qué buena mente!', '¡Lo tenías!',
      '¡Bien observado!', '¡Correcto!', '¡Elegante!', '¡Brillante!'],
    fallo: ['Casi...', 'Tranqui, se aprende', 'Esa tenía truco', 'Buen intento', 'Por poquito', 'Paso a paso',
      'Ahora la sabes', 'Uy, por poco', 'Esa engaña', 'A la próxima'],
  },
};

/** Para un personaje que aún no tenga frases propias (un tema nuevo): el banco general. */
export const FRASES_GENERALES: IFrasesPersonaje = {
  acierto: ['¡Exacto!', '¡Eso es!', '¡Crack!', '¡Fácil para ti!', '¡Muy bien!', '¡Correcto!', '¡Lo sabías!', '¡Bien visto!',
    '¡Directo!', '¡Qué nivel!'],
  fallo: ['Casi...', 'Uy, por poco', 'Esa era trampa', 'Buen intento', 'Por poquito', 'Ahora ya la sabes', 'A la próxima',
    'Esa engaña a muchos', 'Tranqui, se aprende', 'Te faltó poquito'],
};

/** Rachas dentro de un Tap: 3 o 4 seguidas, y las 5 (perfecto). Por tema del motor. */
export const FRASES_RACHA: Readonly<Record<string, { tres: readonly string[]; cinco: readonly string[] }>> = {
  minecraft: { tres: ['¡Racha de bloques!', '¡En llamas!', '¡Imparable!', '¡Qué racha!'], cinco: ['¡Perfecto total!', '¡Leyenda!', '¡Cinco de cinco!'] },
  estudio: { tres: ['¡En racha!', '¡Mente encendida!', '¡Qué ritmo!', '¡No paras!'], cinco: ['¡Perfecto!', '¡Cinco de cinco!', '¡Sin un error!'] },
  aventura: { tres: ['¡En racha!', '¡Aventura total!', '¡Qué ritmo!', '¡No paras!'], cinco: ['¡Perfecto!', '¡Cinco de cinco!', '¡Expedición perfecta!'] },
};
const RACHA_GENERAL = { tres: ['¡En racha!', '¡Qué racha!', '¡No paras!'], cinco: ['¡Perfecto!', '¡Cinco de cinco!'] };

/** Hash FNV-1a de 32 bits: rápido, estable entre navegadores y sin dependencias. */
export function semillaNumero(semilla: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < semilla.length; i++) { h ^= semilla.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  // Mezcla final (avalancha) para que semillas casi iguales («…|1» y «…|2») no caigan en índices vecinos.
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h >>> 0;
}

/** Elige un elemento con la semilla. Con `evitar`, si toca ese se toma el siguiente (nunca dos iguales seguidos). */
export function elegir<T>(lista: readonly T[], semilla: string, evitar?: T): T {
  let i = semillaNumero(semilla) % lista.length;
  if (lista.length > 1 && lista[i] === evitar) i = (i + 1) % lista.length;
  return lista[i];
}

export interface IContextoFrase {
  /** Personaje anfitrión del Tap (`scene.host`). */
  host: string;
  /** Tema del motor (`theme`): decide las frases de racha. */
  theme: string;
  /** Semilla de la partida: sesión + Tap + número de partida. */
  semilla: string;
  /** Frase ya mostrada para la primera respuesta (la que pintó el script previo a hidratar): se conserva para que no cambie. */
  primera?: string;
}

/**
 * Frase de cada respuesta de una partida, en orden. Se calcula toda la secuencia (5 como máximo) para que cada frase
 * sepa cuál salió justo antes y no la repita.
 */
export function frasesPartida(respuestas: readonly boolean[], c: IContextoFrase): string[] {
  const propias = FRASES[c.host] ?? FRASES_GENERALES, racha = FRASES_RACHA[c.theme] ?? RACHA_GENERAL;
  const salida: string[] = [];
  let seguidas = 0;
  respuestas.forEach((ok, i) => {
    seguidas = ok ? seguidas + 1 : 0;
    const lista = !ok ? propias.fallo : seguidas >= 5 ? racha.cinco : seguidas >= 3 ? racha.tres : propias.acierto;
    salida.push(i === 0 && c.primera ? c.primera : elegir(lista, `${c.semilla}|${i}`, salida[i - 1]));
  });
  return salida;
}

/** La frase de la última respuesta (la que se ve en la píldora). */
export function fraseActual(respuestas: readonly boolean[], c: IContextoFrase): string {
  return frasesPartida(respuestas, c).at(-1) ?? '';
}

/** Línea del resultado: una de sus variantes, fija para la misma partida (Tap + aciertos y fallos en orden). */
export function lineaResultado(resultado: ITapResult, semilla: string): string {
  const opciones = resultado.lines?.length ? resultado.lines : [resultado.line];
  return elegir(opciones, semilla);
}
