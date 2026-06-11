import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'adm-institution-layout',
  imports: [RouterOutlet],
  templateUrl: './institution-layout.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './institution-layout.scss'
})
export class InstitutionLayout { }
