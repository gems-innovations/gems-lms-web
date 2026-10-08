import { Injectable } from '@angular/core';
import type { IGradebookItem } from 'education';
import type {
  IGradebookStudentRow, IEnrollmentRow, ISubmissionRow, IAssignmentEntry, IStudentGradeRow,
} from '../domain/model/instructor.model';

const fileSafe = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase();

async function saveExcel(headers: string[], rows: unknown[][], sheetName: string, filename: string): Promise<void> {
  const excelModule = await import('exceljs');
  const Workbook = excelModule.Workbook ?? excelModule.default.Workbook;
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet(sheetName);
  worksheet.addRows([headers, ...rows]);
  worksheet.columns.forEach((column, index) => {
    column.width = index < 2 ? 26 : Math.min(40, Math.max(12, headers[index].length + 2));
  });
  worksheet.getRow(1).font = { bold: true };
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([new Uint8Array(buffer)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

@Injectable({ providedIn: 'root' })
export class ExportUseCase {
  /** Excel con el reporte de todos los estudiantes del curso. */
  async studentsExcel(
    courseTitle: string,
    enrollments: IEnrollmentRow[],
    assignments: IAssignmentEntry[],
    submissions: ISubmissionRow[],
  ): Promise<void> {
    const headers = ['Estudiante', 'Email', 'Estado', 'Avance %', 'Nota promedio',
      ...assignments.map(a => a.block.title)];

    const rows = enrollments.map(e => {
      const subs = submissions.filter(s => s.student.id === e.student.id);
      const graded = subs.filter(s => s.grade != null);
      const avg = graded.length
        ? Math.round(graded.reduce((x, s) => x + (s.grade ?? 0), 0) / graded.length)
        : '';
      const perAssignment = assignments.map(a => {
        const sub = subs.find(s => s.blockId === a.block.id);
        return sub?.grade != null ? sub.grade : (sub ? 'Pendiente' : 'No entregó');
      });
      return [
        `${e.student.firstName} ${e.student.lastName}`,
        e.student.email,
        e.status,
        e.progress?.overallPercentage ?? 0,
        avg,
        ...perAssignment,
      ];
    });

    await saveExcel(headers, rows, 'Estudiantes', `reporte-estudiantes-${fileSafe(courseTitle)}.xlsx`);
  }

  /** Excel del libro de calificaciones (notas ponderadas calculadas por la API). */
  async gradebookExcel(courseTitle: string, items: IGradebookItem[], rows: IGradebookStudentRow[]): Promise<void> {
    const headers = ['Estudiante', 'Email',
      ...items.map(i => `${i.type === 'quiz' ? 'Quiz' : 'Tarea'}: ${i.title || 'Sin título'} (peso ${i.weight})`),
      'Nota actual', 'Nota final'];
    const data = rows.map(r => [
      `${r.student.firstName} ${r.student.lastName}`,
      r.student.email,
      ...items.map(i => {
        const c = r.cells.find(x => x.blockId === i.blockId);
        return c?.score != null ? c.score : c?.state === 'pending' ? 'Por calificar' : 'Sin entregar';
      }),
      r.currentGrade ?? '',
      r.finalGrade ?? '',
    ]);

    await saveExcel(headers, data, 'Calificaciones', `calificaciones-${fileSafe(courseTitle)}.xlsx`);
  }

  /** PDF con el reporte de un estudiante (info + notas + radar opcional). */
  async studentReportPdf(
    courseTitle: string,
    studentName: string,
    studentEmail: string,
    overallProgress: number,
    rows: IStudentGradeRow[],
    radarEl?: HTMLElement | null,
  ): Promise<void> {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    let y = 56;

    doc.setFontSize(18); doc.setFont('helvetica', 'bold');
    doc.text('Reporte del estudiante', 48, y); y += 22;
    doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(110);
    doc.text(courseTitle, 48, y); y += 28;

    doc.setTextColor(20); doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.text(studentName, 48, y); y += 16;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(110);
    doc.text(`${studentEmail}   ·   Avance del curso: ${overallProgress}%`, 48, y); y += 26;

    // Tabla de notas
    doc.setTextColor(20); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('Evaluación', 48, y);
    doc.text('Nota', W - 200, y, { align: 'right' });
    doc.text('Prom. grupo', W - 48, y, { align: 'right' });
    y += 8; doc.setDrawColor(210); doc.line(48, y, W - 48, y); y += 16;

    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    for (const r of rows) {
      if (y > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = 56; }
      doc.setTextColor(40);
      doc.text(r.title.length > 60 ? r.title.slice(0, 59) + '…' : r.title, 48, y);
      const grade = r.grade != null ? `${r.grade}/100` : (r.status === 'missing' ? 'No entregó' : 'Pendiente');
      doc.text(grade, W - 200, y, { align: 'right' });
      doc.text(r.groupAvg != null ? `${r.groupAvg}/100` : '—', W - 48, y, { align: 'right' });
      y += 18;
    }
    y += 10;

    // Radar (best-effort)
    if (radarEl) {
      try {
        const { default: html2canvas } = await import('html2canvas');
        const canvas = await html2canvas(radarEl, { backgroundColor: '#ffffff', scale: 2 });
        const img = canvas.toDataURL('image/png');
        const imgW = 280;
        const imgH = (canvas.height / canvas.width) * imgW;
        if (y + imgH > doc.internal.pageSize.getHeight() - 48) { doc.addPage(); y = 56; }
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(20);
        doc.text('Notas vs promedio del grupo', 48, y); y += 12;
        doc.addImage(img, 'PNG', 48, y, imgW, imgH);
      } catch { /* radar opcional: si falla la captura, el PDF queda sin gráfico */ }
    }

    doc.save(`reporte-${fileSafe(studentName)}-${fileSafe(courseTitle)}.pdf`);
  }
}
