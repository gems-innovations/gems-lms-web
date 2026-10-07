import { downloadCsv } from 'shared';
import type { IAcademicPeriod, IPeriodRecord } from 'education';

export interface IActaPerson { name: string; email: string; }

/** Nota en escala 0–100 con un decimal; «—» cuando no hay nada calificado. */
const grade = (value: number | null) => value == null ? '—' : value.toLocaleString('es-CO', { maximumFractionDigits: 1 });

function byCourse(records: IPeriodRecord[]): Map<string, IPeriodRecord[]> {
  const groups = new Map<string, IPeriodRecord[]>();
  for (const r of records) groups.set(r.courseTitle, [...(groups.get(r.courseTitle) ?? []), r]);
  return groups;
}

const fileBase = (period: IAcademicPeriod) => `actas-${period.name.replace(/[^\w-]+/g, '_')}`;

/** Una fila por estudiante y curso, lista para Excel. */
export function downloadActaCsv(period: IAcademicPeriod, records: IPeriodRecord[], people: Map<string, IActaPerson>): void {
  downloadCsv(`${fileBase(period)}.csv`, [
    ['Período', 'Curso', 'Estudiante', 'Correo', 'Nota final', 'Nota con lo calificado', 'Avance %', 'Resultado'],
    ...records.map(r => {
      const p = people.get(r.studentId);
      return [period.name, r.courseTitle, p?.name ?? `Estudiante ${r.studentId}`, p?.email ?? '',
        grade(r.finalGrade), grade(r.currentGrade), r.progress ?? '', r.passed ? 'Aprobado' : 'No aprobado'];
    }),
  ]);
}

/**
 * Un acta por curso (una o más páginas cada una): encabezado institucional, tabla de notas,
 * resumen y espacios de firma. jsPDF se carga solo al descargar.
 */
export async function downloadActaPdf(period: IAcademicPeriod, records: IPeriodRecord[], people: Map<string, IActaPerson>,
                                      institutionName: string): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  const closed = period.closedAt ? new Date(period.closedAt).toLocaleDateString('es-CO', { dateStyle: 'long' }) : '';
  const cols = [{ title: 'Estudiante', x: M, w: 190 }, { title: 'Correo', x: M + 190, w: 170 },
    { title: 'Nota final', x: M + 360, w: 60 }, { title: 'Avance', x: M + 420, w: 50 }, { title: 'Resultado', x: M + 470, w: 70 }];

  let first = true;
  for (const [course, rows] of byCourse(records)) {
    if (!first) doc.addPage();
    first = false;
    let y = M;
    const header = () => {
      doc.setFillColor(91, 78, 193);
      doc.rect(0, 0, W, 6, 'F');
      doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(110);
      doc.text(institutionName.toUpperCase(), M, y);
      doc.setFont('helvetica', 'bold').setFontSize(17).setTextColor(20);
      doc.text('Acta de calificaciones', M, y + 24);
      doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(70);
      doc.text(`Curso: ${course}`, M, y + 44);
      doc.text(`Período: ${period.name} (${period.startsOn} a ${period.endsOn})${closed ? ` · Cerrado el ${closed}` : ''}`, M, y + 58);
      y += 84;
      doc.setFillColor(242, 242, 248);
      doc.rect(M - 6, y - 13, W - 2 * M + 12, 20, 'F');
      doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(60);
      cols.forEach(c => doc.text(c.title, c.x, y));
      y += 18;
    };
    header();

    const sorted = [...rows].sort((a, b) => (people.get(a.studentId)?.name ?? '').localeCompare(people.get(b.studentId)?.name ?? '', 'es'));
    doc.setFont('helvetica', 'normal').setFontSize(9);
    for (const r of sorted) {
      if (y > H - 150) { doc.addPage(); y = M; header(); doc.setFont('helvetica', 'normal').setFontSize(9); }
      const p = people.get(r.studentId);
      doc.setTextColor(30);
      doc.text(doc.splitTextToSize(p?.name ?? `Estudiante ${r.studentId}`, cols[0].w - 8)[0], cols[0].x, y);
      doc.setTextColor(90);
      doc.text(doc.splitTextToSize(p?.email ?? '', cols[1].w - 8)[0], cols[1].x, y);
      doc.setTextColor(30);
      doc.text(grade(r.finalGrade), cols[2].x, y);
      doc.text(r.progress == null ? '—' : `${r.progress}%`, cols[3].x, y);
      doc.setTextColor(...((r.passed ? [6, 95, 70] : [185, 28, 28]) as [number, number, number]));
      doc.text(r.passed ? 'Aprobado' : 'No aprobado', cols[4].x, y);
      doc.setDrawColor(230);
      doc.line(M - 6, y + 6, W - M + 6, y + 6);
      y += 19;
    }

    const passed = rows.filter(r => r.passed).length;
    const graded = rows.filter(r => r.finalGrade != null);
    const avg = graded.length ? graded.reduce((n, r) => n + (r.finalGrade ?? 0), 0) / graded.length : null;
    y += 12;
    doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(40);
    doc.text(`Estudiantes: ${rows.length}   ·   Aprobados: ${passed}   ·   No aprobados: ${rows.length - passed}   ·   Promedio: ${grade(avg)}`, M, y);

    const sy = H - 70;
    doc.setDrawColor(120);
    doc.line(M, sy, M + 200, sy);
    doc.line(W - M - 200, sy, W - M, sy);
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(90);
    doc.text('Docente', M, sy + 14);
    doc.text('Coordinación académica', W - M - 200, sy + 14);
    doc.setFontSize(8).setTextColor(150);
    doc.text('Generado por GEMS LMS. Nota final sobre 100; el trabajo no entregado cuenta como 0.', M, H - 28);
  }
  if (first) {
    doc.setFont('helvetica', 'normal').setFontSize(12);
    doc.text('El período no tiene cursos con estudiantes inscritos.', M, M);
  }
  doc.save(`${fileBase(period)}.pdf`);
}
