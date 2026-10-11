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
  // Semana 2 de «Piénsala Bien» (18–24 oct).
  { id: 'bate', tag: 'Trampa rápida', q: 'Un bate y una pelota cuestan $1.100 en total. El bate cuesta $1.000 más que la pelota. ¿Cuánto cuesta la pelota?',
    options: ['$100', '$50', '$10', '$1.000'], answer: 1,
    why: '$50. Si la pelota cuesta 50, el bate cuesta 1.050 y juntos dan 1.100. Con 100, el bate costaría 1.100 y el total sería 1.200.' },
  { id: 'nieve', tag: 'Caso de detective', q: 'Un sospechoso dice que pasó toda la tarde en su cabaña, frente a la chimenea encendida. El detective mira el techo cubierto de nieve y sabe que miente. ¿Por qué?',
    options: ['La puerta estaba abierta', 'La nieve del techo no se derritió', 'No había leña', 'Hacía demasiado frío'], answer: 1,
    why: 'La nieve del techo seguía intacta. Con la chimenea encendida toda la tarde, el calor la habría derretido.' },
  { id: 'maquinas', tag: 'Trampa rápida', q: '5 máquinas hacen 5 tornillos en 5 minutos. ¿Cuánto tardan 100 máquinas en hacer 100 tornillos?',
    options: ['100 minutos', '20 minutos', '5 minutos', '1 minuto'], answer: 2,
    why: '5 minutos. Cada máquina hace un tornillo en 5 minutos; con 100 máquinas a la vez salen 100 tornillos en esos mismos 5 minutos.' },
  { id: 'libro', tag: 'Caso de detective', q: 'Un ladrón confiesa: «Escondí el billete entre las páginas 99 y 100 del libro». El detective sabe que miente. ¿Por qué?',
    options: ['El libro tenía 90 páginas', 'Las páginas 99 y 100 son la misma hoja', 'El billete no cabía', 'Nadie lee ese libro'], answer: 1,
    why: 'Son la misma hoja. La página 99 está al frente y la 100 al respaldo: entre ellas no cabe nada.' },
  { id: 'nenufares', tag: 'Trampa rápida', q: 'Los nenúfares de un lago duplican su tamaño cada día. Si tardan 48 días en cubrir todo el lago, ¿en cuántos días cubren la mitad?',
    options: ['24', '47', '12', '46'], answer: 1,
    why: '47. Si cada día se duplican, el día antes de cubrir todo el lago cubrían justo la mitad.' },
  { id: 'cirujana', tag: 'Caso de detective', q: 'Un papá y su hijo tienen un accidente. El papá muere y el niño llega al hospital. Quien lo va a operar lo ve y dice: «No puedo operarlo, es mi hijo». ¿Cómo es posible?',
    options: ['Es su padrastro', 'Es su mamá', 'Es su tío', 'Es un error'], answer: 1,
    why: 'Es su mamá. La cirujana es la mamá del niño; muchos imaginan a un hombre operando y por eso no lo ven.' },
  { id: 'pastillas', tag: 'Trampa rápida', q: 'El médico te da 3 pastillas y te dice que tomes una cada media hora. ¿Cuánto tiempo te duran?',
    options: ['1 hora y media', '1 hora', '2 horas', '30 minutos'], answer: 1,
    why: '1 hora. Tomas la primera ya, la segunda a la media hora y la tercera a la hora.' },
  { id: 'pesca', tag: 'Lógica', q: 'Dos papás y dos hijos fueron a pescar. Pescaron 3 peces y cada uno se llevó uno entero. ¿Cómo es posible?',
    options: ['Uno no pescó', 'Eran abuelo, papá e hijo', 'Partieron un pez', 'Compraron otro'], answer: 1,
    why: 'Eran tres personas: el abuelo, el papá y el hijo. El papá es a la vez papá e hijo.' },
  { id: 'arca', tag: 'Trampa rápida', q: '¿Cuántos animales de cada especie llevó Moisés en el arca?',
    options: ['2', '1', '7', 'Ninguno'], answer: 3,
    why: 'Ninguno. El del arca fue Noé, no Moisés. Leemos tan rápido que el cerebro no lo nota.' },
  { id: 'hotel', tag: 'Caso de detective', q: 'Un hombre empuja su carro hasta un hotel y en ese momento sabe que está en bancarrota. ¿Qué pasó?',
    options: ['Le robaron', 'Estaba jugando Monopoly', 'Se quedó sin gasolina', 'El hotel era muy caro'], answer: 1,
    why: 'Estaba jugando Monopoly. Su ficha era el carrito y cayó en una casilla con hotel que no podía pagar.' },
  { id: 'ladrillo', tag: 'Trampa rápida', q: 'Un ladrillo pesa 1 kilo más medio ladrillo. ¿Cuánto pesa el ladrillo entero?',
    options: ['1,5 kg', '2 kg', '1 kg', '3 kg'], answer: 1,
    why: '2 kilos. Si el ladrillo es 1 kilo más su mitad, esa otra mitad pesa 1 kilo: en total, 2.' },
  { id: 'trillizas', tag: 'Lógica', q: 'Dos niñas nacieron el mismo día, del mismo año, de la misma mamá y el mismo papá, pero no son gemelas. ¿Cómo es posible?',
    options: ['Una es adoptada', 'Son trillizas', 'Nacieron en distinto país', 'Es mentira'], answer: 1,
    why: 'Son trillizas. Hay una tercera hermana: son dos de tres, así que no son gemelas.' },
  { id: 'caracol', tag: 'Razonamiento de examen', q: 'Un caracol está en el fondo de un pozo de 10 metros. De día sube 3 metros y de noche resbala 2. ¿En cuántos días sale?',
    options: ['10', '8', '5', '7'], answer: 1,
    why: '8 días. Avanza 1 metro por día: al final del día 7 está a 7 metros, y el día 8 sube 3 y sale sin volver a resbalar.' },
  { id: 'cumple', tag: 'Lógica', q: 'Anteayer yo tenía 25 años y el próximo año cumpliré 28. ¿Qué día es hoy?',
    options: ['31 de diciembre', '1 de enero', '30 de diciembre', 'Es imposible'], answer: 1,
    why: '1 de enero. Cumple el 31 de diciembre: anteayer tenía 25, el 31 cumplió 26, este año cumple 27 y el próximo, 28.' },
];

/**
 * Quiz de Bloques: preguntas de un juego de bloques y supervivencia, con cálculo y lógica.
 * Los ids son los de los videos del canal (enlaces /bloques?r=<id>). Datos válidos en Java y Bedrock.
 */
export const BLOQUES: IReto[] = [
  { id: 'portal', tag: 'Dato del juego', q: '¿Cuántos bloques de obsidiana necesitas, como mínimo, para un portal al Nether que funcione?',
    options: ['14', '12', '10', '8'], answer: 2,
    why: 'Diez. El marco de 4 × 5 lleva 14 con las esquinas, pero las 4 esquinas no hacen falta para que el portal se encienda.' },
  { id: 'golem', tag: 'Cálculo', q: 'Un gólem de hierro se arma con 4 bloques de hierro. ¿Cuántos lingotes gastas en total?',
    options: ['4', '16', '27', '36'], answer: 3,
    why: '36. Cada bloque de hierro son 9 lingotes: 4 × 9 = 36. Y le falta la calabaza en la cabeza.' },
  { id: 'cofre', tag: 'Cálculo', q: 'Un cofre grande tiene 54 espacios. Si llenas cada uno con 64 bloques, ¿cuántos bloques caben?',
    options: ['2.560', '3.240', '3.456', '6.912'], answer: 2,
    why: '3.456. Son 54 × 64: 50 × 64 = 3.200 y 4 × 64 = 256; en total 3.456.' },
  { id: 'dia', tag: 'Dato del juego', q: '¿Cuánto dura en la vida real un día completo del juego, con su noche?',
    options: ['10 minutos', '20 minutos', '24 minutos', '1 hora'], answer: 1,
    why: '20 minutos: unos 10 de día, 7 de noche y el resto entre el amanecer y el atardecer.' },
  { id: 'creeper', tag: 'Dato del juego', q: '¿De qué animal huyen los creepers?',
    options: ['Del lobo', 'Del gato', 'Del cerdo', 'Del murciélago'], answer: 1,
    why: 'Del gato (y del ocelote). Por eso tener gatos cerca de la casa la protege de explosiones.' },
  { id: 'perlas', tag: 'Dato del juego', q: '¿Cuántas perlas de ender caben en un solo espacio del inventario?',
    options: ['64', '32', '16', '1'], answer: 2,
    why: '16. Igual que los huevos y los letreros; la mayoría de bloques sí llega a 64.' },
  { id: 'tronco', tag: 'Cálculo', q: 'De un tronco salen 4 tablones. ¿Cuántos troncos necesitas para 2 mesas de crafteo y un cofre?',
    options: ['3', '4', '5', '6'], answer: 1,
    why: 'Cuatro. Cada mesa lleva 4 tablones y el cofre 8: 4 + 4 + 8 = 16 tablones, y 16 ÷ 4 = 4 troncos.' },
  { id: 'armadura', tag: 'Cálculo', q: 'Casco 5, peto 8, pantalones 7 y botas 4 lingotes. ¿Cuántos lingotes de hierro cuesta la armadura completa?',
    options: ['20', '22', '24', '26'], answer: 2,
    why: '24. Se suman las cuatro piezas: 5 + 8 + 7 + 4 = 24.' },
  { id: 'carbon', tag: 'Dato del juego', q: '¿Cuántos objetos alcanza a cocinar un solo carbón en el horno?',
    options: ['1', '4', '8', '16'], answer: 2,
    why: 'Ocho. Un bloque de carbón, que son 9 carbones, cocina 80: rinde un poco más.' },
  { id: 'diamantes', tag: 'Lógica', q: 'Steve tiene más diamantes que Alex, y Alex tiene más que Sofi. ¿Quién tiene menos?',
    options: ['Steve', 'Alex', 'Sofi', 'No se sabe'], answer: 2,
    why: 'Sofi. Si Steve tiene más que Alex y Alex más que Sofi, Sofi es la que menos tiene. Este tipo de pregunta sale en los exámenes de admisión.' },
];

/** Cada juego de retos con sus textos: la misma página sirve para varios canales. */
export interface IRetoSet {
  eyebrow: string;
  title: string;
  highlight: string;
  lead: string;
  inviteEyebrow: string;
  inviteTitle: string;
  inviteText: string;
  items: IReto[];
}

export const RETO_SETS: Record<string, IRetoSet> = {
  logica: {
    eyebrow: 'Retos de lógica · gratis', title: 'Los retos,', highlight: 'con su explicación',
    lead: 'Los acertijos de los videos y otros más. Respóndelos aquí y mira por qué la respuesta es esa. Sin registro.',
    inviteEyebrow: 'Para los que piensan bien', inviteTitle: 'Sigue con el curso de casos y acertijos',
    inviteText: 'Un curso gratis con los trucos para pensar como detective, más retos explicados y un reto final. Sin registro.',
    items: RETOS,
  },
  bloques: {
    eyebrow: 'Quiz de Bloques · gratis', title: 'El quiz,', highlight: 'con su explicación',
    lead: 'Las preguntas de los videos y otras más: datos del juego, cuentas rápidas y lógica. Responde y mira por qué. Sin registro.',
    inviteEyebrow: 'Si te fue bien', inviteTitle: 'Entrena tu lógica con más retos',
    inviteText: 'Un curso gratis de casos y acertijos, con trucos para pensar mejor y un reto final. Sin registro.',
    items: BLOQUES,
  },
};
