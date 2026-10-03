import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'edu-player-topbar',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './player-topbar.html',
  styleUrl: './player-topbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerTopbar {
  readonly courseTitle  = input<string>('');
  readonly lessonTitle  = input<string | undefined>(undefined);
  readonly hasPrev      = input<boolean>(false);
  readonly hasNext      = input<boolean>(false);
  readonly progress     = input<number>(0);

  readonly goHome = output<void>();
  readonly openGrades = output<void>();
  readonly prev   = output<void>();
  readonly next   = output<void>();
}
