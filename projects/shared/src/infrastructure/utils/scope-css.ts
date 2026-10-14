/**
 * Antepone un selector de alcance a cada regla de un CSS escrito por una institución, para que sus
 * estilos solo afecten a su home y no al resto de la aplicación.
 *
 * - `html`, `body` y `:root` pasan a ser el propio contenedor.
 * - Se recorren @media, @supports, @container y @layer; @keyframes y @font-face se dejan tal cual.
 * - Cualquier otra regla @ se descarta. Asume CSS ya saneado por el back (sin comentarios ni @import).
 */
export function scopeCss(css: string | null | undefined, scope: string): string {
  if (!css) return '';
  return scopeBlock(css.replace(/\/\*[\s\S]*?\*\//g, ''), scope).trim();
}

const GLOBAL_AT_RULES = /^@(?:-\w+-)?(?:keyframes|font-face|property|counter-style)\b/i;
const NESTING_AT_RULES = /^@(?:media|supports|container|layer)\b/i;

function scopeBlock(src: string, scope: string): string {
  let out = '';
  let i = 0;
  while (i < src.length) {
    const open = nextOutsideString(src, i, '{');
    const semicolon = nextOutsideString(src, i, ';');
    if (semicolon !== -1 && (open === -1 || semicolon < open)) { i = semicolon + 1; continue; }
    if (open === -1) break;
    const close = matchingBrace(src, open);
    const prelude = src.slice(i, open).trim();
    const body = src.slice(open + 1, close === -1 ? src.length : close);
    i = close === -1 ? src.length : close + 1;
    if (!prelude) continue;
    if (prelude.startsWith('@')) {
      if (GLOBAL_AT_RULES.test(prelude)) out += `${prelude}{${body}}`;
      else if (NESTING_AT_RULES.test(prelude)) out += `${prelude}{${scopeBlock(body, scope)}}`;
      continue;
    }
    out += `${splitSelectors(prelude).map(selector => scopeSelector(selector, scope)).join(',')}{${body}}`;
  }
  return out;
}

function scopeSelector(selector: string, scope: string): string {
  const trimmed = selector.trim();
  const root = /^(?:html|body|:root)(?![\w-])/i.exec(trimmed);
  if (root) return `${scope}${trimmed.slice(root[0].length)}`;
  return `${scope} ${trimmed}`;
}

/** Separa por comas que no estén dentro de paréntesis o corchetes. */
function splitSelectors(prelude: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of prelude) {
    if (char === '(' || char === '[') depth++;
    else if (char === ')' || char === ']') depth = Math.max(0, depth - 1);
    if (char === ',' && depth === 0) { parts.push(current); current = ''; } else current += char;
  }
  parts.push(current);
  return parts.filter(part => part.trim());
}

function nextOutsideString(src: string, from: number, target: string): number {
  let quote: string | null = null;
  for (let i = from; i < src.length; i++) {
    const char = src[i];
    if (quote) { if (char === quote) quote = null; continue; }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === target) return i;
    if (target === ';' && char === '{') return -1;
  }
  return -1;
}

function matchingBrace(src: string, open: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let i = open; i < src.length; i++) {
    const char = src[i];
    if (quote) { if (char === quote) quote = null; continue; }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === '{') depth++;
    else if (char === '}' && --depth === 0) return i;
  }
  return -1;
}
