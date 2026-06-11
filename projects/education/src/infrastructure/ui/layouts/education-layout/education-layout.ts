import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'edu-main-layout',
  imports: [RouterOutlet],
  templateUrl: './education-layout.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './education-layout.scss'
})
export class EducationLayout { }
