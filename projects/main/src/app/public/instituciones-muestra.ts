import type { ICard } from 'education';

/**
 * Lección de muestra de /instituciones: las mismas cartas que un profesor pone en un bloque «Cartas» de su curso
 * (edu-cards-player), para que quien evalúa GEMS vea el producto real y no una foto.
 */
export const MUESTRA_CARTAS: ICard[] = [
  {
    kind: 'idea', label: 'Idea', title: 'Antes de compartir, mira quién lo dice',
    text: 'Una noticia falsa se parece mucho a una verdadera. La diferencia casi siempre está en la fuente: quién la publica y si alguien más la confirma.',
    remember: 'Fuente primero, emoción después.',
  },
  {
    kind: 'steps', label: 'Pasos', title: 'Tres preguntas en diez segundos',
    steps: ['¿Quién lo publica? Busca el nombre del medio o de la persona.', '¿Otro medio serio dice lo mismo?', '¿El titular busca que te enojes o te asustes?'],
  },
  {
    kind: 'question', label: 'Pregunta', scene: 'Te llega por un grupo: «URGENTE: mañana cierran todos los colegios». No dice quién lo informa.',
    question: '¿Qué haces primero?', options: ['Lo reenvío para avisar a todos', 'Busco si la Secretaría de Educación lo publicó', 'Le creo porque dice URGENTE'],
    answer: 1, why: 'Si es cierto, la fuente oficial lo habrá dicho. Si no lo encuentras ahí, no lo reenvíes.',
  },
  {
    kind: 'question', label: 'Pregunta', question: '¿Cuál es la mejor señal de que una noticia puede ser falsa?',
    options: ['Tiene muchas fotos', 'Nadie más la publica y pide reenviarla ya', 'Es una noticia larga'],
    answer: 1, why: 'La prisa por reenviar y que ningún medio la confirme son las dos señales más comunes.',
  },
];
