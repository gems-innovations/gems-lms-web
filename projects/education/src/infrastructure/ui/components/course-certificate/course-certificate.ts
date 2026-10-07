import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ICourseCertificate } from '../../../../domain/model/player.model';

@Component({
  selector: 'edu-course-certificate',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './course-certificate.html',
  styleUrl: './course-certificate.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseCertificate {
  readonly certificate = input.required<ICourseCertificate>();
  readonly close       = output<void>();

  protected async downloadPDF(): Promise<void> {
    const element = document.querySelector('.cert-paper') as HTMLElement;
    if (!element) return;

    const cert = this.certificate();
    const [canvasModule, pdfModule] = await Promise.all([import('html2canvas'), import('jspdf')]);
    const html2canvas = canvasModule.default;
    const JsPDF = pdfModule.jsPDF;
    const canvas = await html2canvas(element, { scale: 2.5, useCORS: true, logging: false, backgroundColor: '#fcfbfa' });
    const pdf = new JsPDF({ orientation: 'landscape', unit: 'in', format: 'letter' });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 11, 8.5);
    pdf.save(`Certificado_${cert.studentName.replace(/\s+/g, '_')}_${cert.courseTitle.replace(/\s+/g, '_')}.pdf`);
  }

  protected print(): void {
    window.print();
  }
}
