import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ICourseCertificate } from '../../../../domain/model/player.model';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

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

  protected downloadPDF(): void {
    const element = document.querySelector('.cert-paper') as HTMLElement;
    if (!element) return;

    const cert = this.certificate();
    html2canvas(element, { scale: 2.5, useCORS: true, logging: false, backgroundColor: '#fcfbfa' })
      .then((canvas: HTMLCanvasElement) => {
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'in', format: 'letter' });
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 11, 8.5);
        pdf.save(`Certificado_${cert.studentName.replace(/\s+/g, '_')}_${cert.courseTitle.replace(/\s+/g, '_')}.pdf`);
      });
  }

  protected print(): void {
    window.print();
  }
}
