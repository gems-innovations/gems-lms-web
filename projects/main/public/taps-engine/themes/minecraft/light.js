// Tema «minecraft» · personaje 2D de la capa ligera.
// Dibuja la vista frontal del personaje (16x32 píxeles) directamente desde el PNG de la skin: sin imágenes extra.
// Interfaz que pide el motor: paintCharacter(canvas, imagenDeLaSkin, { slim })
export function paintCharacter(canvas, img, { slim = false } = {}) {
  const old = img.height === 32;                 // skins antiguas 64x32: la pierna y el brazo izquierdos son el espejo de los derechos
  canvas.width = 16; canvas.height = 32;
  const x = canvas.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, 16, 32);
  const sc = img.width / 64;                      // skins 128x128 también valen
  const draw = (sx, sy, w, h, dx, dy, flip) => {
    if (flip) { x.save(); x.translate(dx + w, dy); x.scale(-1, 1); x.drawImage(img, sx * sc, sy * sc, w * sc, h * sc, 0, 0, w, h); x.restore(); }
    else x.drawImage(img, sx * sc, sy * sc, w * sc, h * sc, dx, dy, w, h);
  };
  const aw = slim ? 3 : 4;
  draw(4, 20, 4, 12, 4, 20);
  if (!old) draw(4, 36, 4, 12, 4, 20);                                                   // pierna derecha (a la izquierda del espectador) + pantalón
  if (old) draw(4, 20, 4, 12, 8, 20, true); else { draw(20, 52, 4, 12, 8, 20); draw(4, 52, 4, 12, 8, 20); } // pierna izquierda
  draw(20, 20, 8, 12, 4, 8); if (!old) draw(20, 36, 8, 12, 4, 8);                        // torso + chaqueta
  draw(44, 20, aw, 12, slim ? 1 : 0, 8); if (!old) draw(44, 36, aw, 12, slim ? 1 : 0, 8); // brazo derecho + manga
  if (old) draw(44, 20, aw, 12, 12, 8, true); else { draw(36, 52, aw, 12, 12, 8); draw(52, 52, aw, 12, 12, 8); } // brazo izquierdo
  draw(8, 8, 8, 8, 4, 0); draw(40, 8, 8, 8, 4, 0);                                        // cabeza + sombrero
}
