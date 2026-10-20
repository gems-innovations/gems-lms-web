// Tema «aventura» · capa ligera: dibuja la miniatura PNG del personaje (personajes/<id>/miniatura.png, un render del
// propio modelo con fondo transparente). Sin WebGL ni librerías: es lo que ve quien tiene un equipo flojo o ahorro de datos,
// y lo que se ve mientras carga el 3D. El «respirar», el salto y la sacudida los pone el CSS del motor.
// Interfaz que pide el motor: paintCharacter(canvas, img | null, opciones).
const cache = new Map();
const load = src => {
  if (!cache.has(src)) cache.set(src, new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; }));
  return cache.get(src);
};

export async function paintCharacter(canvas, img, opts = {}) {
  const c = opts.character || {}, src = c.miniatura || c.imagen;
  let pic = img;
  if (!pic && src) { try { pic = await load(src); } catch { return; } }
  if (!pic) return;
  const W = 320, H = 400;
  if (canvas.width !== W) canvas.width = W;
  if (canvas.height !== H) canvas.height = H;
  const x = canvas.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, H);
  const k = Math.min(W / pic.width, H / pic.height), w = pic.width * k, h = pic.height * k;
  x.imageSmoothingEnabled = true; x.drawImage(pic, (W - w) / 2, H - h, w, h);         // pies abajo, centrado
}
