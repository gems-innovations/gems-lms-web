/** Un reto de lógica con su explicación. Los primeros son los del canal «Piénsala Bien», en el mismo orden. */
export interface IReto {
  id: string;
  tag: string;
  q: string;
  options: string[];
  answer: number;
  why: string;
}

export const RETOS: IReto[] = [
  { id: 'junio', tag: 'Caso de detective', q: 'Robaron un collar. El testigo jura que vio al ladrón «el sábado 31 de junio en la noche». El detective supo de inmediato que mentía. ¿Por qué?',
    options: ['Esa noche llovió', 'Junio no tiene 31 días', 'Los sábados no abren', 'Estaba muy oscuro'], answer: 1,
    why: 'Junio tiene 30 días: el 31 de junio no existe, así que el testigo inventó la fecha.' },
  { id: 'hielo', tag: 'Caso de detective', q: 'Dos amigas pidieron el mismo café helado. Una se lo tomó rápido y no le pasó nada; la otra lo tomó despacio y se envenenó. ¿Dónde estaba el veneno?',
    options: ['En el café', 'En el pitillo', 'En el hielo', 'En el vaso'], answer: 2,
    why: 'En el hielo. La que tomó rápido terminó antes de que se derritiera; la que tomó despacio recibió el veneno al derretirse.' },
  { id: 'carrera', tag: 'Trampa rápida', q: 'En una carrera adelantas al que va de segundo. ¿En qué puesto quedas?',
    options: ['Primero', 'Segundo', 'Tercero', 'Depende'], answer: 1,
    why: 'Segundo: ocupas el lugar del que adelantaste, y el primero sigue adelante.' },
  { id: 'velas', tag: 'Trampa rápida', q: 'Había 10 velas encendidas y el viento apagó 3. ¿Cuántas velas quedan al final?',
    options: ['7', '10', '3', '0'], answer: 2,
    why: 'Tres. Las 7 que siguieron encendidas se derriten hasta acabarse; solo quedan las 3 que se apagaron.' },
  { id: 'pizza', tag: 'El billete perdido', q: 'Tres amigos pagan $30.000 por una pizza de $25.000. El mesero se queda $2.000 y les devuelve $1.000 a cada uno. Cada uno pagó $9.000: 27.000 + 2.000 = 29.000. ¿Y los $1.000?',
    options: ['Los tiene el mesero', 'Quedaron en la caja', 'No falta nada', 'Se perdieron en el cambio'], answer: 2,
    why: 'No falta nada: la suma está mal hecha. Los $27.000 que pagaron ya incluyen los $2.000 del mesero (25.000 + 2.000). Se suma con los $3.000 devueltos: 27.000 + 3.000 = 30.000.' },
  { id: 'grabadora', tag: 'Caso de detective', q: 'Hallan a un hombre en su oficina con una grabadora en la mano. Al darle play se oye: «Ya no aguanto más» y un disparo. El detective dice: «Esto no fue lo que parece». ¿Qué lo delató?',
    options: ['No había arma en la oficina', 'La cinta estaba rebobinada al inicio', 'La voz no era la suya', 'Se oyeron dos disparos'], answer: 1,
    why: 'La cinta estaba rebobinada al principio. Si el hombre hubiera grabado eso y disparado, nadie habría podido rebobinarla después: alguien más estuvo ahí.' },
  { id: 'paracaidas', tag: 'Caso de detective', q: 'Un hombre aparece muerto en medio de un campo, sin ninguna huella alrededor y con un paquete cerrado a su lado. ¿Qué pasó?',
    options: ['Le cayó un rayo', 'Saltó de un avión y el paracaídas no abrió', 'Lo dejaron ahí en helicóptero', 'Se perdió caminando de noche'], answer: 1,
    why: 'Saltó de un avión. El paquete cerrado era su paracaídas, que no se abrió; por eso no hay huellas alrededor.' },
  { id: 'apagon', tag: 'Caso de detective', q: 'Se fue la luz a las 8 de la noche y desapareció el reloj de la sala. La cocinera dice que lavaba platos; el chofer, que veía televisión; la jardinera, que prendía velas. ¿Quién miente?',
    options: ['La cocinera', 'El chofer', 'La jardinera', 'Nadie miente'], answer: 1,
    why: 'El chofer. Sin luz no hay televisión: su coartada es imposible.' },
  { id: 'ovejas', tag: 'Trampa rápida', q: 'Un granjero tiene 17 ovejas. Se mueren todas menos 9. ¿Cuántas le quedan?',
    options: ['8', '9', '17', '26'], answer: 1,
    why: 'Nueve. «Todas menos 9» significa que sobreviven 9; no hay que restar nada.' },
  { id: 'hermanos', tag: 'Lógica', q: 'Ana tiene 4 hermanos. Cada uno de sus hermanos tiene una sola hermana. ¿Cuántos hijos hay en la familia?',
    options: ['5', '6', '8', '9'], answer: 0,
    why: 'Cinco. La única hermana de los 4 hermanos es la misma Ana: 4 hermanos + Ana.' },
  { id: 'dias', tag: 'Lógica', q: 'Si anteayer fue jueves, ¿qué día será pasado mañana?',
    options: ['Domingo', 'Lunes', 'Martes', 'Sábado'], answer: 1,
    why: 'Lunes. Si anteayer fue jueves, hoy es sábado, y pasado mañana es lunes.' },
  { id: 'meses', tag: 'Trampa rápida', q: '¿Cuántos meses del año tienen 28 días?',
    options: ['1', '2', '6', '12'], answer: 3,
    why: 'Los 12. Todos los meses tienen al menos 28 días; febrero es el único que tiene solo 28 (o 29).' },
  { id: 'gatos', tag: 'Razonamiento de examen', q: 'Todos los gatos son animales y algunos animales son negros. ¿Se puede asegurar que algunos gatos son negros?',
    options: ['Sí, siempre', 'No se puede asegurar', 'No, ningún gato es negro', 'Solo si son domésticos'], answer: 1,
    why: 'No se puede asegurar. Los animales negros podrían ser todos perros o cuervos: las premisas no dicen nada sobre el color de los gatos. Este tipo de pregunta sale en los exámenes de admisión.' },
  { id: 'serie', tag: 'Razonamiento de examen', q: '¿Qué número sigue? 2, 6, 12, 20, 30, …',
    options: ['36', '40', '42', '44'], answer: 2,
    why: '42. Las diferencias crecen de 2 en 2 (+4, +6, +8, +10, +12). También es n × (n + 1): 6 × 7 = 42.' },
];
