import { BLOQUES } from '../public/retos.data';
import { ITap, ITapQuestion, ITapResult, ITapScene } from './taps.types';

/**
 * Los Taps. Agregar uno = agregar un objeto a TAPS (las preguntas pueden salir del banco ya existente por id).
 * Para otro videojuego: cambia `theme` y `scene` por los de ese tema (ver public/taps-engine/README.md).
 */
function fromBank(ids: string[]): ITapQuestion[] {
  return ids.map(id => {
    const r = BLOQUES.find(b => b.id === id);
    if (!r) throw new Error(`taps.data: no existe la pregunta «${id}» en BLOQUES`);
    return { id: r.id, q: r.q, options: r.options, answer: r.answer, why: r.why };
  });
}

function tap(t: { id: string; title: string; scene: ITapScene; backdrop: [string, string]; ids: string[]; results: ITapResult[]; theme?: string }): ITap {
  return { theme: 'minecraft', kicker: 'Quiz de bloques', questions: fromBank(t.ids), ...t };
}

export const TAPS: ITap[] = [
  tap({
    id: 'redstone',
    title: 'Redstone',
    scene: { world: 'cueva', host: 'sofi', item: 'pick' },
    backdrop: ['#0b0a09', '#3a322b'],
    ids: ['piston', 'pegajoso', 'observador', 'repetidor', 'antorcha-redstone'],
    results: [
      { min: 0, title: 'Aprendiz de antorchas', line: 'Todo gran ingeniero empezó quemándose los dedos. Inténtalo otra vez.' },
      { min: 2, title: 'Electricista del pueblo', line: 'Ya sabes lo básico. Un repetidor más y te sale la granja.' },
      { min: 4, title: 'Maquinista de pistones', line: 'Casi no fallas: tus circuitos ya mueven bloques.' },
      { min: 5, title: 'Crack de redstone', line: 'Perfecto. Hasta los observadores te piden consejo.' },
    ],
  }),
  tap({
    id: 'nether',
    title: 'Nether y End',
    scene: { world: 'nether', host: 'leo', item: 'sword' },
    backdrop: ['#1a0303', '#7a2410'],
    ids: ['portal', 'perlas', 'piglin', 'cama', 'ghast'],
    results: [
      { min: 0, title: 'Turista del Nether', line: 'Cuidado con las camas y con la lava. Inténtalo otra vez.' },
      { min: 2, title: 'Cazador de piglins', line: 'Ya no te roban el oro. Te falta conocer el End.' },
      { min: 4, title: 'Explorador del Nether', line: 'Casi perfecto: los ghast te tienen miedo.' },
      { min: 5, title: 'Rey del Nether', line: 'Cero errores. Hasta el dragón te manda saludos.' },
    ],
  }),
];
