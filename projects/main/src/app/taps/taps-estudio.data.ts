import { ITap } from './taps.types';

/**
 * Taps del tema «estudio» (categorías que no son de Minecraft: «Lógica y trampas» y «Ciencia curiosa»).
 * Personaje y escenarios: public/taps-engine/themes/estudio. Los mismos datos están en public/taps-engine/taps/*.json
 * para la demo estática del motor; la prueba projects/main/taps-engine-tests/themes.test.mjs revisa que coincidan.
 */
export const TAPS_ESTUDIO: ITap[] = [
  {
    id: 'logica-trampas',
    theme: 'estudio',
    title: 'Piénsalo dos veces',
    kicker: 'Lógica y trampas',
    scene: { world: 'aula', host: 'chispa', item: 'lupa' },
    backdrop: ['#1B2B4F', '#2B3F73'],
    questions: [
      {
        id: 'bate',
        q: 'Un bate y una pelota cuestan $1.100 en total. El bate cuesta $1.000 más que la pelota. ¿Cuánto cuesta la pelota?',
        options: ['$100', '$50', '$1.000', '$10'],
        answer: 1,
        why: '$50. Con $100 el bate costaría $1.100 y el total sería $1.200. Con $50, el bate cuesta $1.050 y suman $1.100.',
      },
      {
        id: 'maquinas',
        q: 'Si 5 máquinas hacen 5 piezas en 5 minutos, ¿cuánto tardan 100 máquinas en hacer 100 piezas?',
        options: ['100 minutos', '20 minutos', '5 minutos', '1 minuto'],
        answer: 2,
        why: '5 minutos. Cada máquina hace una pieza en 5 minutos; 100 máquinas a la vez hacen 100 piezas en ese mismo tiempo.',
      },
      {
        id: 'algas',
        q: 'Una mancha de algas duplica su tamaño cada día y tarda 48 días en cubrir todo el lago. ¿Cuántos días tardó en cubrir la mitad?',
        options: ['24', '47', '46', '12'],
        answer: 1,
        why: '47. Si se duplica cada día, un día antes de cubrirlo todo cubría justo la mitad.',
      },
      {
        id: 'carrera',
        q: 'En una carrera adelantas a quien va de segundo. ¿En qué puesto quedas?',
        options: ['Primero', 'Segundo', 'Tercero', 'Depende de la carrera'],
        answer: 1,
        why: 'Segundo. Tomas su lugar; el que va primero sigue adelante.',
      },
      {
        id: 'meses',
        q: '¿Cuántos meses del año tienen 28 días?',
        options: ['1', '2', '12', 'Ninguno'],
        answer: 2,
        why: 'Los 12. Todos tienen al menos 28 días; febrero es el único que tiene solo 28 (o 29 en año bisiesto).',
      },
    ],
    results: [
      { min: 0, title: 'Cayó en la trampa', line: 'Estas preguntas engañan a casi todos. Respira y vuelve a intentarlo.' },
      { min: 2, title: 'Detective en práctica', line: 'Ya ves venir algunas trampas. Desconfía de la primera respuesta.' },
      { min: 4, title: 'Mente afilada', line: 'Casi nada te engaña. Una más y eres imbatible.' },
      { min: 5, title: 'Imposible de engañar', line: 'Cinco de cinco. Tu primera intuición ya no te traiciona.' },
    ],
  },
  {
    id: 'ciencia-curiosa',
    theme: 'estudio',
    title: 'Datos que no esperabas',
    kicker: 'Ciencia curiosa',
    scene: { world: 'laboratorio', host: 'nube', item: 'matraz' },
    backdrop: ['#1E1B4B', '#3B2F86'],
    questions: [
      {
        id: 'venus',
        q: '¿En qué planeta un día dura más que un año?',
        options: ['Marte', 'Venus', 'Júpiter', 'Neptuno'],
        answer: 1,
        why: 'Venus. Tarda unos 243 días terrestres en girar sobre sí mismo y unos 225 en dar la vuelta al Sol.',
      },
      {
        id: 'pulpo',
        q: '¿Cuántos corazones tiene un pulpo?',
        options: ['1', '2', '3', '8'],
        answer: 2,
        why: 'Tres: dos bombean la sangre hacia las branquias y uno hacia el resto del cuerpo.',
      },
      {
        id: 'luz-sol',
        q: '¿Cuánto tarda la luz del Sol en llegar a la Tierra?',
        options: ['Llega al instante', 'Unos 8 minutos', 'Unas 8 horas', 'Un segundo'],
        answer: 1,
        why: 'Unos 8 minutos y 20 segundos: el Sol está a unos 150 millones de kilómetros.',
      },
      {
        id: 'mercurio',
        q: '¿Qué metal es líquido a temperatura ambiente?',
        options: ['Hierro', 'Aluminio', 'Mercurio', 'Plata'],
        answer: 2,
        why: 'El mercurio. Se congela a unos −39 °C, así que a temperatura ambiente es líquido.',
      },
      {
        id: 'hervir',
        q: '¿Dónde hierve el agua a menos de 100 °C?',
        options: ['A nivel del mar', 'En la cima de una montaña', 'En el fondo de una mina', 'En ninguna parte'],
        answer: 1,
        why: 'En lo alto hay menos presión de aire y el agua hierve antes: en Bogotá, a unos 2.600 m, hierve cerca de los 91 °C.',
      },
    ],
    results: [
      { min: 0, title: 'Curioso en entrenamiento', line: 'La ciencia está llena de sorpresas. Prueba otra vez.' },
      { min: 2, title: 'Asistente de laboratorio', line: 'Vas bien. Te faltan un par de datos raros.' },
      { min: 4, title: 'Mente científica', line: 'Casi perfecto. El laboratorio ya es tuyo.' },
      { min: 5, title: 'Premio a la curiosidad', line: 'Cinco de cinco. Hasta Nube quiere tu autógrafo.' },
    ],
  },
];
