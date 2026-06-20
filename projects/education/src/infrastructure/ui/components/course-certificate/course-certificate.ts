import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ICourseCertificate } from '../../../../domain/model/player.model';
import jsPDF from 'jspdf';
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
    if (!element) {
      console.error('Element .cert-paper not found');
      return;
    }

    try {
      // Resolve both ES default and commonJS imports
      const html2canvasFn = (html2canvas as any).default || html2canvas;
      const jsPDFFn = (jsPDF as any).default || jsPDF;

      if (typeof html2canvasFn !== 'function') {
        throw new Error('html2canvas could not be resolved as a function.');
      }

      html2canvasFn(element, {
        scale: 2.5, // optimal scale for sharp text and fast compilation
        useCORS: true,
        logging: false,
        backgroundColor: '#fcfbfa'
      }).then((canvas: HTMLCanvasElement) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDFFn({
          orientation: 'landscape',
          unit: 'in',
          format: 'letter'
        });

        pdf.addImage(imgData, 'PNG', 0, 0, 11, 8.5);
        pdf.save(`Certificado_${this.certificate().studentName.replace(/\s+/g, '_')}_${this.certificate().courseTitle.replace(/\s+/g, '_')}.pdf`);
      }).catch((err: any) => {
        console.error('Error generating PDF canvas:', err);
        alert('Error al generar el PDF: ' + (err.message || err));
      });
    } catch (e: any) {
      console.error('Error initializing PDF download:', e);
      alert('Error al iniciar la descarga del PDF: ' + (e.message || e));
    }
  }

  protected print(): void {
    window.print();
  }
}
