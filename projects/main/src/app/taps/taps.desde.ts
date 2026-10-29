/**
 * Cuándo se agregó cada Tap al banco (AAAA-MM-DD), tomado de la historia del repositorio (primer commit que trae el id en
 * banco/*.json). Lo usa «Explorar» (taps.explorar.ts) para ordenar «Nuevos» y poner la marca «Nuevo» durante 14 días.
 *
 * Al agregar un Tap al banco, agrega su id aquí bajo la fecha de hoy. Un Tap que no esté aquí se trata como el más reciente
 * (va primero en «Nuevos») pero sin marca «Nuevo»: no se inventa una fecha. Límite conocido: no es un campo del banco (el
 * generador no lo fija) para no tocar los JSON ni taps.banco.generated.ts; si el banco gana un campo `desde`, esta tabla sobra. Las historias (solo enlace) no se listan en Explorar y no están aquí.
 */
const POR_FECHA: Record<string, readonly string[]> = {
  '2026-10-19': [
    'mc-gancho', 'mc-crafteo-1', 'mc-mascotas', 'mc-nether-2', 'mc-secretos', 'mc-nether-1', 'mc-mundo', 'mc-crafteo-2',
    'mc-monstruos', 'mc-redstone-1', 'mc-end', 'mc-redstone-3', 'mc-encantamientos', 'mc-mineria', 'mc-nether-3', 'mc-rayos',
    'mc-noche-1', 'mc-nuevos', 'mc-redstone-2', 'mc-leyendas', 'mc-noche-2', 'mc-mezcla', 'mc-taller', 'lg-gancho',
    'lg-adivinanzas-1', 'lg-zorgs', 'lg-lee-bien-2', 'lg-calendario', 'lg-azar', 'lg-series-1', 'lg-lateral', 'lg-series-2',
    'lg-lluvia', 'lg-adivinanzas-2', 'lg-rapidas', 'lg-adivinanzas-3', 'lg-mezcla', 'cu-gancho', 'cu-cuerpo-1', 'cu-espacio-1',
    'cu-datos', 'cu-animales-1', 'cu-ciencia-1', 'cu-geografia-2', 'cu-cuerpo-2', 'cu-geografia-1', 'cu-mitos', 'cu-animales-2',
    'cu-espacio-2', 'cu-gigantes', 'cu-animales-3', 'cu-luz-sonido', 'cu-rarezas'
  ],
  '2026-10-20': [
    'mc-granja', 'mc-monstruos-2', 'mc-agua', 'mc-bastiones', 'mc-end-2', 'mc-crafteo-3', 'mc-cocina', 'mc-redstone-4',
    'mc-redstone-5', 'mc-cultivos', 'mc-subsuelo', 'mc-curiosidades-2', 'mc-curiosidades-3', 'mc-biomas-1', 'mc-estructuras',
    'mc-oceanos', 'mc-aldea-1', 'mc-saqueadores', 'mc-duelo-1', 'lg-adivinanzas-4', 'lg-adivinanzas-5', 'lg-series-3',
    'lg-series-4', 'lg-silogismos-3', 'lg-detectives', 'lg-lee-bien-3', 'lg-palabras', 'lg-lateral-2', 'lg-lateral-3',
    'lg-azar-2', 'lg-numeros', 'lg-codigo-1', 'lg-codigo-2', 'lg-duelo-1', 'cu-cuerpo-3', 'cu-luna', 'cu-planetas',
    'cu-animales-4', 'cu-fauna-colombia', 'cu-cocina', 'cu-colombia', 'cu-maravillas', 'cu-datos-2', 'cu-dinosaurios-1',
    'cu-dinosaurios-2', 'cu-plantas-1', 'cu-plantas-2', 'cu-duelo-1', 'cu-duelo-2'
  ],
  '2026-10-21': [
    'tc-gancho', 'tc-git-1', 'tc-prog-1', 'tc-redes-1', 'tc-seg-1', 'tc-ia-1', 'tc-hw-1', 'tc-git-2', 'tc-prog-2', 'tc-redes-2',
    'tc-seg-2', 'tc-ia-2', 'tc-hw-2', 'tc-git-3', 'tc-prog-3', 'tc-redes-3', 'tc-seg-3', 'tc-ia-3', 'tc-hw-3', 'tc-mezcla'
  ],
  '2026-10-29': ['mc-encantar', 'mc-pociones', 'mc-aldea-2', 'mc-debilidades', 'mc-biomas-2', 'mc-bloques'],
};

export const TAPS_DESDE: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(POR_FECHA).flatMap(([fecha, ids]) => ids.map(id => [id, fecha])));
