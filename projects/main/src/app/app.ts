import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommandPaletteComponent } from './command-palette/command-palette.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommandPaletteComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: '<router-outlet /><app-command-palette />',
})
export class App {}
