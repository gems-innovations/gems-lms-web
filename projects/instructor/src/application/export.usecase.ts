import { Injectable } from '@angular/core';
import type {
  IEnrollmentRow, ISubmissionRow, IAssignmentEntry, IStudentGradeRow,
} from '../domain/model/instructor.model';

const fileSafe = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase();

@Injectable({ providedIn: 'root' })
export class ExportUseCase {
  /** Excel con el reporte de todos los estudiantes del curso. */
  async studentsExcel(
    courseTitle: string,
    enrollments: IEnrollmentRow[],
    assignments: IAssignmentEntry[],
    submissions: ISubmissionRow[],
  ): Promise<void> {
    const mod: any = await import('xlsx');
    const XLSX = mod.utils ? mod : mod.default;

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

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = headers.map((h, i) => ({ wch: i < 2 ? 26 : Math.max(12, h.length + 2) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Estudiantes');
    XLSX.writeFile(wb, `reporte-estudiantes-${fileSafe(courseTitle)}.xlsx`);
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
    const jspdfMod: any = await import('jspdf');
    const JsPDF = jspdfMod.jsPDF ?? jspdfMod.default;
    const doc = new JsPDF({ unit: 'pt', format: 'a4' });
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
        const h2cMod: any = await import('html2canvas');
        const html2canvas = h2cMod.default ?? h2cMod;
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
