import { ICard } from '../domain/model/course.model';

/**
 * Plantillas de cartas para el editor de cursos: el profesor parte de una y cambia lo que quiera.
 * Generado a partir de las clases de ejemplo de la web pública (no editar a mano).
 */
export interface ICardsTemplate { id: string; title: string; summary: string; cards: ICard[] }

export const CARDS_TEMPLATES: ICardsTemplate[] = [
  {
    "id": "trampas-de-la-mente",
    "title": "Tres trampas de tu mente",
    "summary": "Cómo te engañan los atajos de tu cabeza al decidir, y cómo darles la vuelta.",
    "cards": [
      {
        "kind": "idea",
        "label": "Atajos",
        "title": "Tu cabeza toma atajos",
        "text": "Para decidir rápido, tu cerebro usa atajos. Casi siempre ayudan. A veces te llevan directo a un error y se siente como si fuera lógica.",
        "remember": "Lo que se siente obvio no siempre es lo correcto."
      },
      {
        "kind": "question",
        "label": "Pruébalo",
        "scene": "Un bate y una pelota cuestan 1,10 dólares en total. El bate cuesta 1 dólar más que la pelota.",
        "question": "¿Cuánto cuesta la pelota?",
        "options": [
          "10 centavos",
          "5 centavos",
          "1 dólar",
          "50 centavos"
        ],
        "answer": 1,
        "why": "Con 10 centavos el bate costaría 1,10 y juntos 1,20. La pelota cuesta 5 centavos."
      },
      {
        "kind": "idea",
        "label": "Trampa 1",
        "title": "Anclaje: el primer número manda",
        "text": "El primer número que ves se vuelve el punto de partida de tu cabeza. Si antes viste un precio alto, el siguiente parece barato aunque no lo sea.",
        "remember": "Compara con algo ajeno al número que te mostraron."
      },
      {
        "kind": "question",
        "label": "Aplícalo",
        "scene": "Una tienda marca una chaqueta en 400.000 pesos y la deja en 200.000 «de oferta».",
        "question": "¿Qué te dice eso del precio justo?",
        "options": [
          "Que vale 200.000",
          "Nada: el precio inicial lo puso la tienda",
          "Que ahorro 200.000",
          "Que es la mitad de su valor"
        ],
        "answer": 1,
        "why": "El 400.000 solo sirve de ancla. Mira cuánto cuesta algo parecido en otra tienda."
      },
      {
        "kind": "idea",
        "label": "Trampa 2",
        "title": "Confirmación: ves lo que ya crees",
        "text": "Cuando ya tienes una idea, notas lo que la apoya y se te pasa lo que la contradice. Por eso discutir con datos a veces no cambia a nadie.",
        "remember": "Busca a propósito el caso que te lleve la contraria."
      },
      {
        "kind": "question",
        "label": "Aplícalo",
        "scene": "Crees que tu equipo nunca gana de visitante.",
        "question": "¿Qué te conviene buscar para comprobarlo?",
        "options": [
          "Los partidos que perdió",
          "Un partido que ganó de visitante",
          "Lo que opinan tus amigos",
          "Solo los últimos dos partidos"
        ],
        "answer": 1,
        "why": "Un solo ejemplo en contra desmonta un «nunca». Buscarlo a propósito es pensar bien."
      },
      {
        "kind": "question",
        "label": "Trampa 3",
        "scene": "Lanzas una moneda justa cinco veces y sale cara las cinco.",
        "question": "En el sexto lanzamiento, ¿qué es más probable?",
        "options": [
          "Sello, porque «ya toca»",
          "Cara, porque va en racha",
          "Ninguna: sigue siendo mitad y mitad",
          "Depende de cuánto apostaste"
        ],
        "answer": 2,
        "why": "La moneda no recuerda lo que pasó. Cada lanzamiento vuelve a ser 50 y 50."
      }
    ]
  },
  {
    "id": "interes-compuesto",
    "title": "El interés compuesto, sin fórmulas",
    "summary": "Por qué tu dinero puede crecer sobre sí mismo y por qué empezar temprano pesa tanto.",
    "cards": [
      {
        "kind": "idea",
        "label": "La idea",
        "title": "Ganar intereses sobre los intereses",
        "text": "En el interés compuesto, lo que ganas se suma a tu dinero, y el siguiente interés se calcula sobre el total, no solo sobre lo que pusiste al comienzo.",
        "remember": "Cada año ganas sobre una base más grande."
      },
      {
        "kind": "question",
        "label": "Pruébalo",
        "scene": "Pones 100.000 pesos al 10 % anual. Al terminar el primer año tienes 110.000.",
        "question": "¿Cuánto tienes al terminar el segundo año?",
        "options": [
          "120.000",
          "121.000",
          "110.000",
          "130.000"
        ],
        "answer": 1,
        "why": "El 10 % del segundo año se calcula sobre 110.000: ganas 11.000, no 10.000."
      },
      {
        "kind": "idea",
        "label": "Truco",
        "title": "La regla del 72",
        "text": "Divide 72 entre la tasa anual y obtienes, más o menos, los años que tarda tu dinero en duplicarse. Al 6 %, unos 12 años.",
        "remember": "72 ÷ tasa = años para duplicar."
      },
      {
        "kind": "question",
        "label": "Aplícalo",
        "scene": "Tu dinero crece a 8 % anual.",
        "question": "¿En cuántos años se duplica, aproximadamente?",
        "options": [
          "6 años",
          "9 años",
          "12 años",
          "16 años"
        ],
        "answer": 1,
        "why": "72 ÷ 8 = 9. Es una regla aproximada, pero acierta muy cerca."
      },
      {
        "kind": "idea",
        "label": "Tiempo",
        "title": "Empezar temprano pesa más que ahorrar mucho",
        "text": "Con el mismo ahorro mensual, quien empieza diez años antes termina con bastante más, porque su dinero tuvo más tiempo para crecer sobre sí mismo.",
        "remember": "El tiempo es el ingrediente que no se compra después."
      },
      {
        "kind": "question",
        "label": "Aplícalo",
        "scene": "Ana y Luis ahorran lo mismo cada mes y ganan la misma tasa. Ana empieza a los 20 y Luis a los 30.",
        "question": "A los 60 años, ¿quién suele tener más?",
        "options": [
          "Ana",
          "Luis",
          "Los dos igual",
          "Depende solo del banco"
        ],
        "answer": 0,
        "why": "Los diez años extra de Ana dejan que su dinero crezca sobre sí mismo mucho más tiempo."
      }
    ]
  },
  {
    "id": "leer-noticias",
    "title": "Antes de compartir esa noticia",
    "summary": "Cuatro preguntas rápidas para no regalar tu clic a una mentira.",
    "cards": [
      {
        "kind": "idea",
        "label": "Contexto",
        "title": "Lo falso viaja más rápido",
        "text": "Los mensajes que dan rabia o susto se comparten más que los tranquilos. Por eso una mentira bien armada llega lejos antes de que alguien la revise.",
        "remember": "Si te da mucha rabia, respira antes de compartir."
      },
      {
        "kind": "question",
        "label": "Pregunta 1: fuente",
        "scene": "Te llega por un chat: «Según un estudio, tomar agua caliente cura la gripa». No dice quién hizo el estudio.",
        "question": "¿Qué haces primero?",
        "options": [
          "Lo compartes: por si acaso",
          "Buscas quién hizo el estudio y dónde se publicó",
          "Cuentas cuántos lo reenviaron",
          "Lo crees si suena a ciencia"
        ],
        "answer": 1,
        "why": "Sin una fuente que puedas encontrar, «según un estudio» no prueba nada."
      },
      {
        "kind": "idea",
        "label": "Pregunta 2: prueba",
        "title": "Pide la evidencia, no el adjetivo",
        "text": "«Increíble», «urgente», «lo que no quieren que sepas» son adjetivos, no pruebas. Una prueba se puede ver: un documento, una cifra con su origen, un video completo.",
        "remember": "Adjetivos no son datos."
      },
      {
        "kind": "question",
        "label": "Pregunta 3: fecha",
        "scene": "Ves una foto de una inundación con el titular «Esta mañana en tu ciudad». Una búsqueda de imagen muestra que la foto es de hace seis años en otro país.",
        "question": "¿Qué te dice eso?",
        "options": [
          "Que puede ser verdad, igual",
          "Que la imagen se está usando fuera de contexto",
          "Que seis años no importan",
          "Que la búsqueda se equivocó"
        ],
        "answer": 1,
        "why": "Una foto real puede mentir si la ponen en otro lugar y otra fecha."
      },
      {
        "kind": "question",
        "label": "Pregunta 4: intención",
        "scene": "Un perfil anónimo publica que cierta marca «cura todo» y pone el enlace de compra al final.",
        "question": "¿A quién le sirve que lo creas?",
        "options": [
          "A nadie en particular",
          "A quien vende el producto",
          "A ti, que ahorras tiempo",
          "A los que lo reenvían"
        ],
        "answer": 1,
        "why": "Preguntarte quién gana si lo crees es una de las mejores pruebas rápidas."
      }
    ]
  },
  {
    "id": "metodo-cientifico",
    "title": "Cómo saber si algo es cierto",
    "summary": "Hipótesis, pruebas y la diferencia entre «pasan juntas» y «una causa a la otra».",
    "cards": [
      {
        "kind": "idea",
        "label": "La idea",
        "title": "Una hipótesis se puede probar",
        "text": "Una hipótesis es una respuesta posible que puedes comprobar. «Las plantas crecen más con música» sirve si puedes medir cuánto crecen con música y sin ella.",
        "remember": "Si no hay forma de probarla, todavía no es una hipótesis."
      },
      {
        "kind": "question",
        "label": "Pruébalo",
        "scene": "Quieres saber si un fertilizante nuevo hace crecer más rápido las plantas de tu casa.",
        "question": "¿Cuál es la mejor prueba?",
        "options": [
          "Ponerlo a todas y ver si crecen",
          "Ponerlo a unas plantas y no a otras iguales, en las mismas condiciones",
          "Preguntarle al vendedor",
          "Ponerlo solo a las plantas más débiles"
        ],
        "answer": 1,
        "why": "Necesitas un grupo de comparación: lo único que debe cambiar es el fertilizante."
      },
      {
        "kind": "idea",
        "label": "Cuidado",
        "title": "Juntas no es causa",
        "text": "En verano suben las ventas de helado y también los casos de insolación. No es que el helado cause insolación: las dos cosas dependen del calor.",
        "remember": "Cuando dos cosas suben juntas, busca una tercera."
      },
      {
        "kind": "question",
        "label": "Aplícalo",
        "scene": "Un colegio nota que los estudiantes que desayunan sacan mejores notas.",
        "question": "¿Qué conclusión es la más cuidadosa?",
        "options": [
          "Desayunar da mejores notas",
          "Hay relación, pero faltan pruebas de que desayunar sea la causa",
          "Las notas hacen que desayunen",
          "No hay ninguna relación"
        ],
        "answer": 1,
        "why": "Puede haber otros factores, como el sueño o el apoyo en casa. Hace falta probar cambiando solo el desayuno."
      },
      {
        "kind": "question",
        "label": "Final",
        "scene": "Tu hipótesis es: «Todos los cisnes son blancos». Has visto cien cisnes blancos.",
        "question": "¿Qué la derribaría?",
        "options": [
          "Ver otros cien cisnes blancos",
          "Ver un solo cisne negro",
          "Que alguien más lo piense",
          "Que no puedas ver más cisnes"
        ],
        "answer": 1,
        "why": "Un solo caso en contra basta para tumbar un «todos». Por eso se prueba intentando equivocar la idea."
      }
    ]
  },
  {
    "id": "probabilidad-diaria",
    "title": "Probabilidad para el día a día",
    "summary": "Qué tan probable es, de verdad, lo que tu intuición te dice.",
    "cards": [
      {
        "kind": "idea",
        "label": "La idea",
        "title": "Piensa en «de cada cien»",
        "text": "Una probabilidad del 20 % significa que, si el mismo caso se repitiera cien veces, pasaría unas veinte. Decirlo así lo hace mucho más fácil de imaginar.",
        "remember": "Convierte el porcentaje en «de cada cien»."
      },
      {
        "kind": "question",
        "label": "Pruébalo",
        "scene": "Lanzas un dado normal de seis caras.",
        "question": "¿Qué tan probable es sacar 1 o 2?",
        "options": [
          "Una de cada seis",
          "Una de cada tres",
          "La mitad",
          "Una de cada cuatro"
        ],
        "answer": 1,
        "why": "Hay dos resultados buenos de seis posibles: 2 de 6, o sea una de cada tres."
      },
      {
        "kind": "idea",
        "label": "Cuidado",
        "title": "Independientes: no se acuerdan",
        "text": "Si dos eventos no se influyen, lo que pasó antes no cambia lo que viene. Una moneda no «compensa» las caras anteriores.",
        "remember": "La suerte no lleva cuentas."
      },
      {
        "kind": "question",
        "label": "Aplícalo",
        "scene": "Hay un 30 % de probabilidad de lluvia el sábado y un 30 % el domingo, y son días independientes.",
        "question": "Con esos datos, ¿cuál afirmación es correcta?",
        "options": [
          "El fin de semana tiene 60 % de lluvia",
          "La lluvia del sábado no cambia la probabilidad del domingo",
          "Si llueve el sábado, seguro no llueve el domingo",
          "Es seguro que lloverá uno de los dos días"
        ],
        "answer": 1,
        "why": "Al ser independientes, lo que pase el sábado no cambia el 30 % del domingo. Y sumarlos sin más no funciona."
      },
      {
        "kind": "question",
        "label": "Final",
        "scene": "Una rifa vende 1.000 boletas a 10.000 pesos y el premio es de 5.000.000. Compras una boleta.",
        "question": "¿Cuál es tu probabilidad de ganar?",
        "options": [
          "1 de cada 10",
          "1 de cada 100",
          "1 de cada 1.000",
          "1 de cada 5.000"
        ],
        "answer": 2,
        "why": "Hay una boleta tuya entre 1.000: una de cada mil, o 0,1 %."
      }
    ]
  },
  {
    "id": "seguridad-digital",
    "title": "Cuida tus cuentas en tres pasos",
    "summary": "Contraseñas largas, correos falsos y verificación en dos pasos, sin tecnicismos.",
    "cards": [
      {
        "kind": "idea",
        "label": "Contraseñas",
        "title": "Largo le gana a raro",
        "text": "Una contraseña es difícil de adivinar por su longitud, no por llenarla de símbolos. Una frase de varias palabras sin relación entre sí es larga, fácil de recordar y difícil de romper.",
        "remember": "Mejor una frase larga que una palabra con signos."
      },
      {
        "kind": "question",
        "label": "Pruébalo",
        "scene": "Necesitas una contraseña nueva para tu correo.",
        "question": "¿Cuál es la más segura?",
        "options": [
          "Sofia2008!",
          "tortuga-lampara-nube-cafe-rio",
          "contraseña123",
          "El nombre de tu mascota"
        ],
        "answer": 1,
        "why": "Es larga y no usa datos personales. Las otras son cortas, comunes o fáciles de adivinar con lo que publicas."
      },
      {
        "kind": "idea",
        "label": "Reutilizar",
        "title": "Una clave por cuenta",
        "text": "Cuando una página sufre una filtración, los atacantes prueban esas mismas claves en otros sitios. Si usas la misma en todo, una sola filtración abre todas tus cuentas.",
        "remember": "Una clave repetida es una llave maestra para quien la robe."
      },
      {
        "kind": "question",
        "label": "Phishing",
        "scene": "Te llega un correo del «banco»: «Tu cuenta será bloqueada hoy. Ingresa ya en este enlace para evitarlo».",
        "question": "¿Qué haces?",
        "options": [
          "Entras rápido para no perder la cuenta",
          "Respondes pidiendo más información",
          "No tocas el enlace y entras escribiendo tú la dirección oficial",
          "Reenvías el correo a tus amigos"
        ],
        "answer": 2,
        "why": "La prisa y la amenaza son señales típicas de phishing. Entra siempre por la dirección oficial, no por el enlace."
      },
      {
        "kind": "idea",
        "label": "Dos pasos",
        "title": "La clave sola ya no basta",
        "text": "La verificación en dos pasos pide, además de la contraseña, algo que solo tú tienes: un código en una aplicación o en el celular. Si te roban la clave, igual les falta ese segundo paso.",
        "remember": "Contraseña más código: dos puertas en vez de una."
      },
      {
        "kind": "question",
        "label": "Aplícalo",
        "scene": "Te llega un mensaje con un código de verificación que no pediste, y luego alguien por llamada te pide que se lo digas «para ayudarte».",
        "question": "¿Qué significa?",
        "options": [
          "Que alguien intenta entrar a tu cuenta y necesita tu código",
          "Que el banco quiere confirmar tus datos",
          "Que el código ya no sirve",
          "Que puedes compartirlo si la persona suena amable"
        ],
        "answer": 0,
        "why": "Ese código es tu segundo paso. Nadie legítimo lo pide: si lo das, le abres la puerta a la persona que intenta entrar."
      }
    ]
  },
  {
    "id": "habitos-de-estudio",
    "title": "Estudiar menos tiempo y recordar más",
    "summary": "Práctica espaciada, autoevaluación y sueño: lo que la evidencia dice que funciona.",
    "cards": [
      {
        "kind": "idea",
        "label": "Espaciado",
        "title": "Repartir gana a amontonar",
        "text": "Estudiar en varias sesiones cortas, con días de por medio, produce un recuerdo más duradero que meter todo en una sola noche. Olvidar un poco y volver a recordar fortalece la memoria.",
        "remember": "Mejor tres sesiones de 30 minutos que una de hora y media."
      },
      {
        "kind": "question",
        "label": "Pruébalo",
        "scene": "Tienes examen en una semana y 3 horas para prepararlo en total.",
        "question": "¿Cómo conviene repartirlas?",
        "options": [
          "Las 3 horas la noche anterior",
          "Una hora al día, en tres días distintos de la semana",
          "Las 3 horas el primer día y nada más",
          "Solo releer en el bus el día del examen"
        ],
        "answer": 1,
        "why": "Repartir las horas con días de por medio ayuda a recordar mejor que concentrarlas en una sola sesión."
      },
      {
        "kind": "idea",
        "label": "Autoevaluarse",
        "title": "Recordar es lo que enseña a recordar",
        "text": "Intentar sacar la información de tu cabeza, sin mirar el apunte, fortalece la memoria más que releerlo. Releer da la sensación de que ya lo sabes, pero engaña.",
        "remember": "Cierra el cuaderno y pregúntate."
      },
      {
        "kind": "question",
        "label": "Aplícalo",
        "scene": "Terminas un capítulo y quieres saber si lo aprendiste.",
        "question": "¿Qué te sirve más?",
        "options": [
          "Subrayarlo todo de nuevo",
          "Leerlo otra vez de corrido",
          "Cerrar el libro y escribir lo que recuerdas",
          "Copiar el resumen del compañero"
        ],
        "answer": 2,
        "why": "Intentar recordar sin ayuda es práctica real, y además te muestra qué te falta repasar."
      },
      {
        "kind": "idea",
        "label": "Sueño",
        "title": "Dormir también es estudiar",
        "text": "Durante el sueño el cerebro consolida lo aprendido durante el día. Dormir poco después de estudiar perjudica la memoria, y trasnochar para repasar suele salir mal.",
        "remember": "Una buena noche de sueño afianza lo que estudiaste."
      },
      {
        "kind": "question",
        "label": "Aplícalo",
        "scene": "La noche antes del examen te quedan dos opciones: estudiar hasta las 4 a. m. o repasar un rato y dormir.",
        "question": "¿Qué suele convenir más?",
        "options": [
          "Estudiar toda la noche",
          "No dormir y tomar mucho café",
          "Dormir poco, pero repasar al amanecer",
          "Repasar un rato y dormir bien"
        ],
        "answer": 3,
        "why": "Dormir bien ayuda a fijar lo estudiado y a concentrarte al día siguiente. Trasnochar quita ambas cosas."
      },
      {
        "kind": "question",
        "label": "Mito",
        "scene": "Alguien dice: «Yo soy visual, así que solo aprendo viendo imágenes; los demás son auditivos».",
        "question": "¿Qué dice la evidencia sobre los «estilos de aprendizaje»?",
        "options": [
          "Cada persona aprende mejor si se le enseña solo en su estilo",
          "No hay pruebas sólidas de que enseñar según el estilo mejore el aprendizaje",
          "Solo funcionan en adultos",
          "Los visuales no necesitan practicar"
        ],
        "answer": 1,
        "why": "Las revisiones de estudios no encuentran que adaptar la enseñanza al «estilo» mejore los resultados. Importa más cómo practicas."
      }
    ]
  },
  {
    "id": "como-funciona-internet",
    "title": "Qué pasa cuando abres una página",
    "summary": "Direcciones, paquetes, servidores y el candado del navegador, explicados con ejemplos simples.",
    "cards": [
      {
        "kind": "idea",
        "label": "Direcciones",
        "title": "Cada aparato tiene una dirección",
        "text": "Para encontrarse en internet, cada servidor tiene una dirección IP, una serie de números. Recordar números es difícil, así que usamos nombres como un contacto del celular, y el sistema DNS los traduce a números.",
        "remember": "El dominio es el nombre; la IP, el número."
      },
      {
        "kind": "question",
        "label": "Pruébalo",
        "scene": "Escribes el nombre de una página en el navegador y todavía no sabe a dónde ir.",
        "question": "¿Qué hace el DNS?",
        "options": [
          "Cifra tu contraseña",
          "Traduce el nombre de la página a una dirección IP",
          "Descarga la página a tu disco",
          "Bloquea los virus"
        ],
        "answer": 1,
        "why": "El DNS funciona como una agenda: convierte un nombre fácil de recordar en la dirección numérica que usan las máquinas."
      },
      {
        "kind": "idea",
        "label": "Paquetes",
        "title": "La información viaja en trozos",
        "text": "Cuando pides una foto o una página, los datos se cortan en pequeños paquetes. Cada uno puede viajar por un camino distinto y, al llegar, se vuelven a armar en orden.",
        "remember": "Internet reparte trozos y tu equipo los junta."
      },
      {
        "kind": "question",
        "label": "Aplícalo",
        "scene": "Un archivo grande llega a tu celular en muchos pedazos pequeños que siguieron rutas distintas.",
        "question": "¿Qué pasa al final?",
        "options": [
          "Se descarta el archivo y se pide de nuevo",
          "Los pedazos se vuelven a ensamblar en el orden correcto",
          "Cada pedazo se abre como un archivo aparte",
          "El archivo queda incompleto siempre"
        ],
        "answer": 1,
        "why": "Cada paquete lleva información para ordenarse, y tu equipo los junta. Si alguno falta, se vuelve a pedir ese."
      },
      {
        "kind": "idea",
        "label": "Servidores",
        "title": "Un servidor es un computador que atiende",
        "text": "Un servidor es un computador que guarda páginas o datos y responde cuando tú, el cliente, los pides. No es un aparato mágico: es una máquina conectada que está disponible casi todo el tiempo.",
        "remember": "Cliente pide, servidor responde."
      },
      {
        "kind": "idea",
        "label": "HTTPS",
        "title": "El candado cifra el camino",
        "text": "HTTPS cifra la conexión entre tu navegador y el sitio, así que quien esté en medio, por ejemplo en un wifi público, no puede leer lo que envías. También confirma que hablas con el dominio que escribiste.",
        "remember": "El candado protege el trayecto, no la honestidad del sitio."
      },
      {
        "kind": "question",
        "label": "Final",
        "scene": "Una página que imita a un banco tiene candado en la barra del navegador.",
        "question": "¿Qué significa ese candado?",
        "options": [
          "Que el sitio es un banco real",
          "Que la conexión está cifrada, pero no garantiza que el sitio sea confiable",
          "Que no hay virus en la página",
          "Que nadie puede copiarla"
        ],
        "answer": 1,
        "why": "El candado indica conexión cifrada con ese dominio. Cualquiera puede tenerlo, incluso un sitio falso: revisa bien el nombre."
      }
    ]
  },
  {
    "id": "programar-primeros-pasos",
    "title": "Programar: cuatro ideas para empezar",
    "summary": "Variables, condiciones, ciclos y cómo buscar un error, con ejemplos en palabras.",
    "cards": [
      {
        "kind": "idea",
        "label": "Variables",
        "title": "Una variable es una cajita con nombre",
        "text": "Una variable guarda un dato bajo un nombre para usarlo después. Si escribes edad = 15, el programa recuerda ese 15 y puedes cambiarlo cuando quieras.",
        "remember": "Nombre a la izquierda, valor a la derecha."
      },
      {
        "kind": "question",
        "label": "Pruébalo",
        "scene": "Un programa hace: puntos = 10, luego puntos = puntos + 5.",
        "question": "¿Cuánto vale puntos al final?",
        "options": [
          "10",
          "5",
          "15",
          "105"
        ],
        "answer": 2,
        "why": "Primero puntos vale 10; después se toma ese valor, se le suman 5 y se guarda el resultado: 15."
      },
      {
        "kind": "idea",
        "label": "Condiciones",
        "title": "Decidir con «si»",
        "text": "Una condición hace que el programa elija un camino. «Si llueve, llevo paraguas; si no, no». El programa revisa si algo es cierto y actúa según eso.",
        "remember": "Si pasa esto, haz aquello; si no, haz otra cosa."
      },
      {
        "kind": "question",
        "label": "Aplícalo",
        "scene": "Regla: «si edad es menor que 18, mostrar Menor; si no, mostrar Adulto». La edad es 18.",
        "question": "¿Qué muestra el programa?",
        "options": [
          "Menor",
          "Adulto",
          "Los dos",
          "Ninguno"
        ],
        "answer": 1,
        "why": "18 no es menor que 18, así que la condición es falsa y el programa va por el «si no»: Adulto."
      },
      {
        "kind": "idea",
        "label": "Ciclos",
        "title": "Repetir sin copiar y pegar",
        "text": "Un ciclo repite unas instrucciones varias veces. En vez de escribir «saluda» cien veces, escribes «repite 100 veces: saluda». Menos texto y menos errores.",
        "remember": "Si lo haces más de dos veces, probablemente necesitas un ciclo."
      },
      {
        "kind": "question",
        "label": "Aplícalo",
        "scene": "Un programa hace: total = 0; repite 4 veces: total = total + 3.",
        "question": "¿Cuánto vale total al terminar?",
        "options": [
          "3",
          "7",
          "12",
          "4"
        ],
        "answer": 2,
        "why": "Cada vuelta suma 3: 3, 6, 9 y 12. Cuatro vueltas dan 12."
      },
      {
        "kind": "question",
        "label": "Depurar",
        "scene": "Tu programa da un resultado equivocado y no sabes dónde está el error.",
        "question": "¿Qué conviene hacer primero?",
        "options": [
          "Reescribir todo desde cero",
          "Revisar paso a paso y comprobar el valor de las variables en cada punto",
          "Cambiar cosas al azar hasta que funcione",
          "Dejarlo así y esperar que se arregle"
        ],
        "answer": 1,
        "why": "Depurar es seguir el programa paso a paso para encontrar dónde el valor deja de ser el esperado."
      }
    ]
  },
  {
    "id": "fracciones-y-porcentajes",
    "title": "Fracciones y porcentajes sin miedo",
    "summary": "Comparar fracciones, sacar un porcentaje y no caer en el truco de subir y bajar un 20 %.",
    "cards": [
      {
        "kind": "idea",
        "label": "La idea",
        "title": "Para comparar, usa el mismo denominador",
        "text": "Una fracción es una parte de un todo. Para saber cuál es mayor, llévalas al mismo denominador: así las porciones son del mismo tamaño y se comparan directo.",
        "remember": "Mismo denominador, comparas los numeradores."
      },
      {
        "kind": "question",
        "label": "Pruébalo",
        "scene": "Dos amigos comparten pizzas del mismo tamaño. A Ana le toca 3/5 de una y a Beto 2/3 de otra.",
        "question": "¿Quién come más?",
        "options": [
          "Ana",
          "Los dos igual",
          "No se puede saber",
          "Beto"
        ],
        "answer": 3,
        "why": "Con denominador 15: 3/5 es 9/15 y 2/3 es 10/15. Beto come un poco más."
      },
      {
        "kind": "idea",
        "label": "Porcentaje",
        "title": "Un porcentaje es una fracción de 100",
        "text": "El 50 % es la mitad y el 25 % es la cuarta parte. Para sacar el 10 % de un número, divídelo entre 10. Con ese 10 % armas casi cualquier otro.",
        "remember": "10 % = dividir entre 10. 5 % = la mitad de eso."
      },
      {
        "kind": "question",
        "label": "Aplícalo",
        "scene": "Quieres calcular una propina del 15 % sobre una cuenta de 200.000 pesos.",
        "question": "¿Cuánto es?",
        "options": [
          "15.000",
          "45.000",
          "20.000",
          "30.000"
        ],
        "answer": 3,
        "why": "El 10 % de 200.000 es 20.000 y el 5 % es 10.000. Sumados dan 30.000."
      },
      {
        "kind": "idea",
        "label": "Trampa",
        "title": "Subir y bajar el mismo porcentaje no empata",
        "text": "Cada porcentaje se calcula sobre el valor que tienes en ese momento. Si algo sube un 20 % y luego baja un 20 %, el segundo 20 % se toma de una cifra más grande.",
        "remember": "El porcentaje siempre depende de la base."
      },
      {
        "kind": "question",
        "label": "Aplícalo",
        "scene": "Un producto de 100.000 pesos sube un 20 % y la semana siguiente baja un 20 %.",
        "question": "¿Cuánto cuesta al final?",
        "options": [
          "100.000",
          "104.000",
          "96.000",
          "80.000"
        ],
        "answer": 2,
        "why": "Sube a 120.000. El 20 % de 120.000 es 24.000, así que baja a 96.000."
      },
      {
        "kind": "question",
        "label": "Descuentos",
        "scene": "Una camiseta de 80.000 pesos tiene un 25 % de descuento.",
        "question": "¿Cuánto pagas?",
        "options": [
          "60.000",
          "55.000",
          "65.000",
          "75.000"
        ],
        "answer": 0,
        "why": "El 25 % es la cuarta parte: 80.000 ÷ 4 = 20.000 de descuento. Pagas 60.000."
      }
    ]
  },
  {
    "id": "validar-una-idea",
    "title": "Valida tu idea antes de construirla",
    "summary": "Cómo comprobar con personas reales que tu idea de negocio resuelve algo, antes de gastar tiempo y dinero.",
    "cards": [
      {
        "kind": "idea",
        "label": "El riesgo",
        "title": "Construir primero es la apuesta más cara",
        "text": "Mucha gente pasa meses creando algo y recién después descubre que a nadie le dolía ese problema. Hablar con posibles clientes cuesta poco y te ahorra ese golpe.",
        "remember": "Primero el problema, después la solución."
      },
      {
        "kind": "question",
        "label": "Pruébalo",
        "scene": "Tienes la idea de una app para organizar turnos en peluquerías de barrio.",
        "question": "¿Cuál es el mejor primer paso?",
        "options": [
          "Contratar a un programador",
          "Diseñar el logo",
          "Conversar con dueños de peluquerías sobre cómo manejan hoy los turnos",
          "Pagar publicidad en redes"
        ],
        "answer": 2,
        "why": "Antes de invertir, confirma que el problema existe y cómo lo resuelven hoy."
      },
      {
        "kind": "idea",
        "label": "Preguntas",
        "title": "Pregunta por el pasado, no por opiniones",
        "text": "Si preguntas «¿te gustaría esto?», casi todos dicen que sí por cortesía. Es más útil preguntar qué pasó la última vez que tuvieron el problema y qué hicieron.",
        "remember": "Lo que la gente hizo vale más que lo que dice que haría."
      },
      {
        "kind": "question",
        "label": "Aplícalo",
        "scene": "Vas a entrevistar a posibles clientes de tu idea.",
        "question": "¿Cuál pregunta sesga menos la respuesta?",
        "options": [
          "¿Te gustaría una app como la mía?",
          "¿Cuándo fue la última vez que tuviste este problema y qué hiciste?",
          "¿No crees que mi idea es genial?",
          "¿Pagarías por esto, verdad?"
        ],
        "answer": 1,
        "why": "Pide un hecho real y no empuja a la persona a darte la razón."
      },
      {
        "kind": "idea",
        "label": "Producto mínimo",
        "title": "Prueba con lo mínimo que enseñe algo",
        "text": "Un producto mínimo es la versión más pequeña que te deja aprender si alguien lo quiere. Puede ser una página sencilla, una lista de espera o hacerlo a mano al principio.",
        "remember": "No busques que sea perfecto, busca que te enseñe."
      },
      {
        "kind": "question",
        "label": "Aplícalo",
        "scene": "Quieres saber si tu barrio compraría almuerzos saludables a domicilio.",
        "question": "¿Qué es lo más parecido a un producto mínimo?",
        "options": [
          "Montar una cocina industrial",
          "Esperar a tener un sitio web perfecto",
          "Pedir un préstamo grande",
          "Preparar diez almuerzos y ofrecerlos a conocidos esta semana"
        ],
        "answer": 3,
        "why": "Con poco gasto ves si hay quien compre y qué le falta al producto."
      },
      {
        "kind": "question",
        "label": "Señales",
        "scene": "Varias personas te dicen «qué buena idea, me encanta». Una sola te pide que le avises cuando esté lista y deja un anticipo.",
        "question": "¿Qué señal pesa más?",
        "options": [
          "El anticipo",
          "Los elogios",
          "Que lo comenten con otros",
          "Que te den la razón en todo"
        ],
        "answer": 0,
        "why": "Poner dinero o tiempo es un compromiso real. Los elogios no cuestan nada."
      }
    ]
  },
  {
    "id": "como-funcionan-las-vacunas",
    "title": "Cómo funcionan las vacunas",
    "summary": "Qué le enseñan a tu sistema inmune, por qué hay refuerzos y qué es la inmunidad de grupo.",
    "cards": [
      {
        "kind": "idea",
        "label": "Defensas",
        "title": "Tu sistema inmune reconoce intrusos",
        "text": "Los virus y las bacterias tienen señas propias. Tu sistema inmune aprende a reconocerlas y a atacarlas. La primera vez que se topa con un microbio nuevo tarda en reaccionar.",
        "remember": "Reconocer rápido es la mitad de la defensa."
      },
      {
        "kind": "question",
        "label": "Pruébalo",
        "scene": "Alguien te pregunta qué hace una vacuna dentro del cuerpo.",
        "question": "¿Cuál es la mejor explicación general?",
        "options": [
          "Reemplaza tus defensas",
          "Funciona como un antibiótico",
          "Cambia tu ADN",
          "Entrena al sistema inmune para reconocer un microbio antes de que te enferme"
        ],
        "answer": 3,
        "why": "La vacuna muestra una versión inofensiva de las señas del microbio para que el cuerpo practique."
      },
      {
        "kind": "idea",
        "label": "Memoria",
        "title": "El sistema inmune guarda memoria",
        "text": "Tras reconocer un microbio, el cuerpo conserva células de memoria. Si el microbio aparece de verdad, la respuesta es más rápida y fuerte que la primera vez.",
        "remember": "Una vacuna prepara la memoria sin pasar por la enfermedad."
      },
      {
        "kind": "question",
        "label": "Aplícalo",
        "scene": "Para algunas vacunas se indican dosis de refuerzo.",
        "question": "¿Para qué sirven, en general?",
        "options": [
          "Porque la primera dosis nunca sirve",
          "Para recordarle al cuerpo y fortalecer su respuesta de memoria",
          "Porque el cuerpo olvida todo de inmediato",
          "Son solo un trámite"
        ],
        "answer": 1,
        "why": "En algunas vacunas la protección necesita reforzarse para durar más."
      },
      {
        "kind": "idea",
        "label": "Comunidad",
        "title": "Inmunidad de grupo",
        "text": "Cuando muchas personas están protegidas, el microbio encuentra pocos lugares donde propagarse. Eso también cuida a quienes no pueden vacunarse, como bebés muy pequeños o algunas personas con enfermedades.",
        "remember": "Proteger a muchos protege también a los que no pueden vacunarse."
      },
      {
        "kind": "question",
        "label": "Aplícalo",
        "scene": "Un compañero dice que la inmunidad de grupo es un cuento.",
        "question": "¿Qué idea describe mejor cómo funciona?",
        "options": [
          "Solo protege a quienes se vacunaron",
          "Es un mito sin ningún efecto",
          "Al circular menos el microbio, también se reduce el riesgo para quienes no pueden vacunarse",
          "Solo sirve para adultos mayores"
        ],
        "answer": 2,
        "why": "Con más gente protegida, el contagio se corta con más frecuencia y llega a menos personas."
      },
      {
        "kind": "question",
        "label": "Efectos comunes",
        "scene": "Después de una vacuna, a alguien le duele un poco el brazo y tiene algo de cansancio por uno o dos días.",
        "question": "¿Qué suele indicar esto?",
        "options": [
          "Que el sistema inmune está respondiendo, y suele pasar pronto",
          "Que la vacuna falló",
          "Que ya tiene la enfermedad grave",
          "Que nunca debe vacunarse otra vez"
        ],
        "answer": 0,
        "why": "Molestias leves y breves son comunes. Si son fuertes o te preocupan, consulta a un profesional de salud."
      }
    ]
  },
  {
    "id": "energia-y-clima",
    "title": "Energía y clima: lo básico",
    "summary": "La diferencia entre energía fósil y renovable, qué es el efecto invernadero y por qué el tiempo no es el clima.",
    "cards": [
      {
        "kind": "idea",
        "label": "Fuentes",
        "title": "Fósil y renovable",
        "text": "El carbón, el petróleo y el gas se formaron durante millones de años, y al quemarlos se libera dióxido de carbono. El sol, el viento y el agua en movimiento se renuevan de forma continua.",
        "remember": "Fósil: se agota y emite. Renovable: se repone."
      },
      {
        "kind": "question",
        "label": "Pruébalo",
        "scene": "Una empresa quiere producir electricidad con una fuente renovable.",
        "question": "¿Cuál de estas opciones lo es?",
        "options": [
          "Carbón",
          "Gas natural",
          "Petróleo",
          "Viento"
        ],
        "answer": 3,
        "why": "El viento se renueva solo. El carbón, el gas y el petróleo son combustibles fósiles."
      },
      {
        "kind": "idea",
        "label": "Invernadero",
        "title": "El efecto invernadero es natural",
        "text": "Gases como el vapor de agua, el dióxido de carbono y el metano retienen parte del calor de la Tierra. Sin ese efecto, el planeta sería mucho más frío. El problema es que quemar fósiles añade más gases.",
        "remember": "Lo natural es necesario. El exceso es lo que preocupa."
      },
      {
        "kind": "question",
        "label": "Aplícalo",
        "scene": "Te dicen que el efecto invernadero es siempre algo dañino.",
        "question": "¿Qué corrección es la más acertada?",
        "options": [
          "Es cierto, no debería existir",
          "Lo causa el agujero en la capa de ozono",
          "Es natural y necesario; lo que preocupa es el aumento por quemar combustibles fósiles",
          "Solo existe por la contaminación"
        ],
        "answer": 2,
        "why": "Sin efecto invernadero natural la Tierra sería muy fría. El ozono es otro tema distinto."
      },
      {
        "kind": "idea",
        "label": "Dos palabras",
        "title": "Tiempo no es clima",
        "text": "El tiempo es lo que pasa hoy o esta semana: lluvia, sol, frío. El clima es el comportamiento típico de un lugar medido durante muchos años, por lo general décadas.",
        "remember": "Tiempo: un día. Clima: promedio de años."
      },
      {
        "kind": "question",
        "label": "Aplícalo",
        "scene": "Un día hace un frío fuera de lo normal en tu ciudad y alguien dice: «Entonces el clima no se está calentando».",
        "question": "¿Qué le responderías?",
        "options": [
          "Un día frío es tiempo; el clima se mide con promedios de muchos años",
          "Tiene razón: un día frío lo prueba",
          "Tiene razón si el frío dura una semana",
          "Depende del termómetro que uses"
        ],
        "answer": 0,
        "why": "Un solo día o una semana es tiempo. Para hablar de clima se miran tendencias de muchos años."
      }
    ]
  }
];
