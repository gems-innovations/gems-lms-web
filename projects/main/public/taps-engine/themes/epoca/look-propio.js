// Archivo aparte (no en rig.js) a propósito: solo usa exports que rig.js ya tenía, así una pestaña abierta con el rig.js viejo en
// memoria no rompe al cargar el renderer nuevo tras un despliegue.
import { lookOf, validarLook } from './rig.js';

/** El look del personaje con el propio de un Tap de creador encima; si el propio no es válido, el del catálogo tal cual. */
export const lookPropio = (character, propio) => (propio && typeof propio === 'object' && !Array.isArray(propio) && !validarLook(propio).length
  ? lookOf({ look: { ...(character?.look || {}), ...propio } })
  : lookOf(character));