import { ITap, ITapRun } from './taps.types';
import { puntuables, respuestasPuntuables, resultFor } from './taps.logic';

/**
 * «Retar a un amigo» (competencia-y-recompensas.md §5.3, experiencia-ux.md §5.6): texto tipo Wordle sin spoilers,
 * enlace al MISMO Tap y una tarjeta 9:16 dibujada en el navegador con la marca de GEMS LMS.
 */

/** Dominio que se muestra en la marca de agua (el enlace real usa el origen actual). */
export const SHARE_BRAND_URL = 'lms.gemsinnovations.com/taps';

/** Enlace al mismo Tap: `/t/<id>` (prerenderizada con la tarjeta del Tap; ese Tap va primero en el feed). */
export function shareUrl(origin: string, tapId: string): string {
  return `${origin.replace(/\/$/, '')}/t/${encodeURIComponent(tapId)}`;
}

/**
 * Cuadrícula sin spoilers: un cuadro por pregunta (verde acierto, rojo fallo, blanco sin responder). Es el único uso de
 * emoji aceptado: va en el texto que se pega en WhatsApp (formato Wordle reconocible), nunca en la interfaz.
 */
export function shareGrid(answers: readonly boolean[], total: number): string {
  return Array.from({ length: total }, (_, i) => (i >= answers.length ? '⬜' : answers[i] ? '\u{1F7E9}' : '\u{1F7E5}')).join('');
}

/** Texto listo para pegar. Sin `url` cuando el menú de compartir la recibe aparte (no se duplica). */
export function shareText(tap: ITap, run: ITapRun, url?: string): string {
  const total = puntuables(tap);
  const lines = [
    `Taps de GEMS LMS · ${tap.title}`,
    `${shareGrid(respuestasPuntuables(tap, run.answers), total)} ${run.score}/${total} · ${resultFor(tap, run.score).title}`,
    tap.tipo === 'historia' ? '¿Tú qué habrías hecho? Una historia de menos de un minuto.' : `¿Me ganas? ${total} preguntas, menos de un minuto.`,
  ];
  if (url) lines.push(url);
  return lines.join('\n');
}

export interface IShareCardData {
  tapTitle: string;
  title: string;
  score: number;
  total: number;
  answers: readonly boolean[];
  /** Colores del tema [arriba, abajo]. */
  backdrop: readonly [string, string];
  logo?: CanvasImageSource | null;
  /** Personaje 2D (canvas pequeño de píxeles) que se escala sin suavizado. */
  character?: HTMLCanvasElement | null;
}

const CARD_W = 1080, CARD_H = 1920;
const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

/** Dibuja la tarjeta 9:16 (1080×1920). Solo navegador. */
export function drawShareCard(data: IShareCardData, canvas: HTMLCanvasElement = document.createElement('canvas')): HTMLCanvasElement {
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const x = canvas.getContext('2d');
  if (!x) return canvas;
  // Cielo en dos franjas planas (sin degradado), como el fondo del Tap.
  x.fillStyle = data.backdrop[0];
  x.fillRect(0, 0, CARD_W, CARD_H);
  x.fillStyle = data.backdrop[1];
  x.fillRect(0, CARD_H * 0.42, CARD_W, CARD_H * 0.58);
  x.fillStyle = 'rgba(7, 9, 12, .45)';
  x.fillRect(0, 0, CARD_W, CARD_H);

  // Panel central
  roundRect(x, 72, 250, CARD_W - 144, 1400, 56);
  x.fillStyle = 'rgba(14, 17, 22, .86)';
  x.fill();

  // Personaje
  if (data.character) {
    // 1:2 = personaje de bloques en píxeles (sin suavizar); otra proporción = miniatura ilustrada (p. ej. 4:5 del registro)
    const ratio = data.character.width / data.character.height || 0.5, pixel = Math.abs(ratio - 0.5) < 0.01;
    x.imageSmoothingEnabled = !pixel;
    const h = pixel ? 520 : 440, w = h * ratio;
    x.fillStyle = 'rgba(0, 0, 0, .35)';
    x.beginPath(); x.ellipse(CARD_W / 2, 330 + h + 10, 150, 26, 0, 0, Math.PI * 2); x.fill();
    x.drawImage(data.character, CARD_W / 2 - w / 2, 330, w, h);
    x.imageSmoothingEnabled = true;
  }

  x.textAlign = 'center';
  x.fillStyle = '#c9d2e0';
  x.font = `700 40px ${FONT}`;
  x.fillText(`MI TÍTULO EN ${data.tapTitle.toUpperCase()}`, CARD_W / 2, 960);
  x.fillStyle = '#ffffff';
  const titleLines = wrap(x, data.title, CARD_W - 240, `800 96px ${FONT}`);
  titleLines.forEach((line, i) => x.fillText(line, CARD_W / 2, 1070 + i * 104));
  const gridY = 1070 + titleLines.length * 104 + 10;

  // Cuadrícula sin spoilers
  const size = 120, gap = 22, total = data.total, gx = CARD_W / 2 - (total * size + (total - 1) * gap) / 2;
  for (let i = 0; i < total; i++) {
    const ok = data.answers[i];
    roundRect(x, gx + i * (size + gap), gridY, size, size, 22);
    x.fillStyle = i >= data.answers.length ? '#3a4150' : ok ? '#2FBF71' : '#E5484D';
    x.fill();
    drawMark(x, gx + i * (size + gap) + size / 2, gridY + size / 2, i >= data.answers.length ? null : ok);
  }
  x.fillStyle = '#e9eef6';
  x.font = `700 52px ${FONT}`;
  x.fillText(`${data.score} de ${data.total} · ¿Me ganas?`, CARD_W / 2, gridY + size + 100);

  // Marca de agua GEMS LMS: logo + nombre + dirección
  const by = 1745;
  if (data.logo) x.drawImage(data.logo, CARD_W / 2 - 230, by - 62, 84, 84);
  x.textAlign = 'left';
  x.fillStyle = '#ffffff';
  x.font = `800 54px ${FONT}`;
  x.fillText('GEMS LMS', CARD_W / 2 - 128, by);
  x.textAlign = 'center';
  x.fillStyle = 'rgba(255, 255, 255, .78)';
  x.font = `600 40px ${FONT}`;
  x.fillText(SHARE_BRAND_URL, CARD_W / 2, by + 80);
  return canvas;
}

/** Personaje 2D del tema (su `light.js` + la skin del anfitrión), para la tarjeta. Si algo falla devuelve null. */
export async function paintThemeCharacter(themeUrl: string, host: string): Promise<HTMLCanvasElement | null> {
  try {
    const base = new URL(themeUrl, location.href);
    const theme = await (await fetch(base.href)).json() as {
      light?: string; characters?: Record<string, { skin: string; slim?: boolean }>; personajes?: string[];
    };
    // Personaje del registro (taps-engine/personajes/<id>/personaje.json): su miniatura ya es la imagen 2D.
    if (!theme.characters?.[host] && theme.personajes?.length) {
      const id = theme.personajes.includes(host) ? host : theme.personajes[0];
      const url = new URL(`../../personajes/${id}/personaje.json`, base);
      const m = await (await fetch(url.href)).json() as { miniatura?: string };
      if (!m.miniatura) return null;
      const img = await loadImage(new URL(m.miniatura, url).href);
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      canvas.getContext('2d')?.drawImage(img, 0, 0);
      return canvas;
    }
    const char = theme.characters?.[host] ?? Object.values(theme.characters ?? {})[0];
    if (!theme.light || !char) return null;
    const [mod, img] = await Promise.all([
      import(/* @vite-ignore */ new URL(theme.light, base).href) as Promise<{ paintCharacter?: (c: HTMLCanvasElement, i: HTMLImageElement, o: { slim?: boolean }) => void }>,
      loadImage(new URL(char.skin, base).href),
    ]);
    if (!mod.paintCharacter) return null;
    const canvas = document.createElement('canvas');
    mod.paintCharacter(canvas, img, { slim: char.slim });
    return canvas;
  } catch {
    return null;
  }
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = src; });
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise(ok => canvas.toBlob(b => ok(b), 'image/png'));
}

function roundRect(x: CanvasRenderingContext2D, left: number, top: number, w: number, h: number, r: number): void {
  x.beginPath();
  x.moveTo(left + r, top);
  x.arcTo(left + w, top, left + w, top + h, r);
  x.arcTo(left + w, top + h, left, top + h, r);
  x.arcTo(left, top + h, left, top, r);
  x.arcTo(left, top, left + w, top, r);
  x.closePath();
}

/** Marca dibujada (sin emojis): visto para acierto, X para fallo. */
function drawMark(x: CanvasRenderingContext2D, cx: number, cy: number, ok: boolean | null): void {
  if (ok === null) return;
  x.save();
  x.strokeStyle = ok ? '#06210f' : '#ffffff';
  x.lineWidth = 12;
  x.lineCap = 'round';
  x.lineJoin = 'round';
  x.beginPath();
  if (ok) { x.moveTo(cx - 26, cy + 2); x.lineTo(cx - 6, cy + 22); x.lineTo(cx + 28, cy - 20); }
  else { x.moveTo(cx - 22, cy - 22); x.lineTo(cx + 22, cy + 22); x.moveTo(cx + 22, cy - 22); x.lineTo(cx - 22, cy + 22); }
  x.stroke();
  x.restore();
}

function wrap(x: CanvasRenderingContext2D, text: string, max: number, font: string): string[] {
  x.font = font;
  const words = text.split(/\s+/), lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (x.measureText(test).width > max && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}
