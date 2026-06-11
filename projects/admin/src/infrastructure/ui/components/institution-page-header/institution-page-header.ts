import { Component, output, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'adm-institution-page-header',
  standalone: true,
  templateUrl: './institution-page-header.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './institution-page-header.scss'
})
export class InstitutionPageHeader {
  readonly onCreateNew = output<void>();
}
