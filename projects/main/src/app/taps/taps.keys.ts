/**
 * Atajos de teclado de Taps en escritorio (escritorio.md §6.2). Traduce una tecla a una acción; el componente decide
 * si aplica (foco en un campo o diálogo, atajos apagados, panel con foco…). Sin DOM para probarlo fácil.
 */
export type TTapKeyAction =
  | { kind: 'option'; index: number }
  | { kind: 'step'; dir: 1 | -1 }
  | { kind: 'sound' | 'challenge' | 'topics' | 'focus' | 'menu' | 'help' | 'escape' | 'continue' };

/** Teclas de un solo carácter: por WCAG 2.1.4 la persona puede apagarlas. Las de navegación (flechas, Esc) no. */
const SINGLE: Record<string, TTapKeyAction> = {
  '1': { kind: 'option', index: 0 }, '2': { kind: 'option', index: 1 }, '3': { kind: 'option', index: 2 }, '4': { kind: 'option', index: 3 },
  a: { kind: 'option', index: 0 }, b: { kind: 'option', index: 1 }, c: { kind: 'option', index: 2 }, d: { kind: 'option', index: 3 },
  j: { kind: 'step', dir: 1 }, k: { kind: 'step', dir: -1 },
  m: { kind: 'sound' }, r: { kind: 'challenge' }, t: { kind: 'topics' }, f: { kind: 'focus' }, '[': { kind: 'menu' }, '?': { kind: 'help' },
};
const NAV: Record<string, TTapKeyAction> = {
  ArrowDown: { kind: 'step', dir: 1 }, PageDown: { kind: 'step', dir: 1 },
  ArrowUp: { kind: 'step', dir: -1 }, PageUp: { kind: 'step', dir: -1 },
  Escape: { kind: 'escape' },
};

export interface ITapKeyEvent { key: string; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean }

/** null si la tecla no es un atajo (o lleva Ctrl/Alt/Meta). `shortcuts` = atajos de un carácter activos. */
export function keyAction(event: ITapKeyEvent, shortcuts: boolean): TTapKeyAction | null {
  // AltGr (teclados en español: «[» es AltGr + ´) llega como Ctrl + Alt: se admite solo para «[», que no tiene otra forma de escribirse.
  const altGr = event.key === '[' && !!event.ctrlKey && !!event.altKey && !event.metaKey;
  if (!altGr && (event.ctrlKey || event.metaKey || event.altKey)) return null;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (NAV[key]) return NAV[key];
  if (key === ' ' || key === 'Enter') return shortcuts || key === 'Enter' ? { kind: 'continue' } : null;
  return shortcuts ? SINGLE[key] ?? null : null;
}

/** ¿El foco está donde se escribe o en un diálogo? Los atajos no se activan ahí. */
export function typingTarget(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el as HTMLElement).isContentEditable || !!el.closest('dialog');
}
