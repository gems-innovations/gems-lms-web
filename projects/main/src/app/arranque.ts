/**
 * Pantalla de arranque de index.html (#gems-arranque). Se funde cuando la primera página ya está pintada debajo
 * (nunca antes: no queremos un fotograma en blanco entre la marca y el contenido) y luego se quita del DOM.
 * Ver projects/shared/ESTADOS-DE-CARGA.md §Primer arranque.
 */
export function ocultarArranque(doc: Document | undefined = globalThis.document): void {
  const el = doc?.getElementById('gems-arranque');
  if (!doc || !el) return;
  if (!doc.documentElement.classList.contains('gems-arrancando')) { el.remove(); return; }
  performance.mark?.('gems-arranque-fin');
  el.classList.add('ga-fuera');
  const quitar = () => { el.remove(); doc.documentElement.classList.remove('gems-arrancando'); };
  el.addEventListener('transitionend', quitar, { once: true });
  setTimeout(quitar, 400); // movimiento reducido o pestaña oculta: transitionend puede no llegar
}

/** Angular no pudo arrancar (chunk caído, error de red): la pantalla de arranque ofrece «Recargar». */
export function arranqueFallido(doc: Document | undefined = globalThis.document): void {
  doc?.getElementById('gems-arranque')?.classList.add('ga-fallo');
}
