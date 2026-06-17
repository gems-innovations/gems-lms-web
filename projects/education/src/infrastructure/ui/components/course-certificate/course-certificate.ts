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

  protected print(): void {
    window.print();
  }
}
