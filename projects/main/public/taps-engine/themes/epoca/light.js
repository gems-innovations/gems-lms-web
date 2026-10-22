// Tema «época» · personaje de la capa ligera (sin bucle de animación: un dibujo por cambio).
// Usa el mismo rig que el renderizador, así que el presentador se ve igual en modo ligero, solo que quieto: el «respirar»
// lo pone el CSS del motor y la cara cambia con cada reacción (paintReaction).
// Interfaz que pide el motor: paintCharacter(canvas, null, opciones) y, opcional, paintReaction(canvas, anim, opciones).
import { poseFor, drawHost, lookOf } from './rig.js';

const W = 480, H = 600, SCALE = 1.45;                 // 4:5 a doble resolución (nítido en pantallas de alta densidad)

const STILL = {
  idle: () => poseFor('still'),
  talk: () => ({ ...poseFor('still'), mouth: 'open', mouthOpen: 0.7, armR: [0.62, 0.9] }),
  think: () => poseFor('think'),
  celebrate: () => poseFor('happy'), dance: () => poseFor('happy'), happy: () => poseFor('happy'),
  hurt: () => ({ ...poseFor('oops'), eyes: 'wince', tint: 0.6 }), oops: () => poseFor('oops'),
  sad: () => ({ ...poseFor('sad', 0, 0), y: 0 }),
};

function paint(canvas, anim, o = {}) {
  if (canvas.width !== W) canvas.width = W;
  if (canvas.height !== H) canvas.height = H;
  const c = canvas.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
  const P = { ...(STILL[anim] || STILL.idle)(), y: (STILL[anim] || STILL.idle)().y * 0.4 };
  drawHost(c, W / 2, H - 132 * SCALE, SCALE, P, lookOf(o.character), { item: o.item, T: 0 });
}

export function paintCharacter(canvas, _img, opts = {}) { paint(canvas, 'idle', opts); }
export function paintReaction(canvas, anim, opts = {}) { paint(canvas, anim, opts); }
