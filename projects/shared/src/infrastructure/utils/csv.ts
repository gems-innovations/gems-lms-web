/**
 * CSV sin dependencias. Lee archivos exportados desde Excel (separador «;» en configuración
 * regional española) o desde Google Sheets («,»), con comillas, saltos de línea entre comillas
 * y BOM. Escribe con «;» y BOM para que Excel en español abra las tildes y columnas bien.
 */

/** Separador más frecuente en la primera línea fuera de comillas. */
export function detectDelimiter(text: string): ',' | ';' | '\t' {
  const firstLine = text.replace(/^﻿/, '').split(/\r?\n/, 1)[0] ?? '';
  let inQuotes = false;
  const counts = { ',': 0, ';': 0, '\t': 0 };
  for (const ch of firstLine) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && ch in counts) counts[ch as keyof typeof counts]++;
  }
  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]) as ',' | ';' | '\t';
}

/** Filas como arreglos de celdas; omite filas vacías. */
export function parseCsv(text: string, delimiter = detectDelimiter(text)): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  const src = text.replace(/^﻿/, '');

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cell += ch;
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === delimiter) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some(c => c.trim() !== '')) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some(c => c.trim() !== '')) rows.push(row);
  return rows.map(r => r.map(c => c.trim()));
}

/**
 * Filas como objetos usando la primera fila como encabezados normalizados (minúsculas, sin
 * tildes ni espacios: «Correo electrónico» → «correoelectronico»).
 */
export function parseCsvObjects(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const [head, ...body] = parseCsv(text);
  const headers = (head ?? []).map(normalizeHeader);
  return { headers, rows: body.map(cells => Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']))) };
}

export function normalizeHeader(header: string): string {
  return header.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
}

/** Texto CSV listo para descargar (BOM + «;»). Neutraliza fórmulas al abrirlo en Excel. */
export function toCsv(rows: (string | number | null | undefined)[][], delimiter = ';'): string {
  const escape = (value: string | number | null | undefined) => {
    let s = value == null ? '' : String(value);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /["\n\r]/.test(s) || s.includes(delimiter) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + rows.map(r => r.map(escape).join(delimiter)).join('\r\n');
}

/** Descarga un CSV en el navegador. */
export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]): void {
  if (typeof document === 'undefined') return;
  const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
